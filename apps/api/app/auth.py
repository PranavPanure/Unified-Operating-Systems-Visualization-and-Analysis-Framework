import base64
import hashlib
import os
import secrets
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta
from threading import Lock
from time import monotonic

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserSession

SESSION_COOKIE = "os_a2z_session"
CSRF_COOKIE = "os_a2z_csrf"
SESSION_DAYS = 14
AUTH_RATE_WINDOW = 60.0
AUTH_RATE_LIMIT = 30
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
_auth_attempts: dict[str, deque[float]] = defaultdict(deque)
_auth_rate_lock = Lock()


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterRequest(Credentials):
    display_name: str = Field(min_length=1, max_length=120)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    display_name: str


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    encode = lambda value: base64.urlsafe_b64encode(value).decode().rstrip("=")
    return f"scrypt$16384$8$1${encode(salt)}${encode(digest)}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, n, r, p, salt_value, digest_value = stored.split("$")
        if algorithm != "scrypt":
            return False
        padding = lambda value: value + "=" * (-len(value) % 4)
        salt = base64.urlsafe_b64decode(padding(salt_value))
        expected = base64.urlsafe_b64decode(padding(digest_value))
        actual = hashlib.scrypt(password.encode(), salt=salt, n=int(n), r=int(r), p=int(p))
        return secrets.compare_digest(actual, expected)
    except (TypeError, ValueError):
        return False


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _create_session(db: Session, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        UserSession(
            token_hash=_token_hash(token),
            user_id=user_id,
            expires_at=datetime.now(UTC) + timedelta(days=SESSION_DAYS),
        )
    )
    db.commit()
    return token


def _set_session_cookie(response: Response, token: str) -> None:
    production = os.getenv("APP_ENV", "development") == "production"
    cookie_samesite = "none" if production else "lax"
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=True,
        samesite=cookie_samesite,
        secure=production,
    )
    response.set_cookie(
        CSRF_COOKIE,
        secrets.token_urlsafe(32),
        max_age=SESSION_DAYS * 24 * 60 * 60,
        httponly=False,
        samesite=cookie_samesite,
        secure=production,
    )


def auth_rate_limit(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    now = monotonic()
    with _auth_rate_lock:
        attempts = _auth_attempts[client]
        while attempts and now - attempts[0] > AUTH_RATE_WINDOW:
            attempts.popleft()
        if len(attempts) >= AUTH_RATE_LIMIT:
            raise HTTPException(status_code=429, detail="Too many authentication attempts; try again soon")
        attempts.append(now)


def verify_csrf(
    csrf_cookie: str | None = Cookie(default=None, alias=CSRF_COOKIE),
    csrf_header: str | None = Header(default=None, alias="X-CSRF-Token"),
) -> None:
    if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
        raise HTTPException(status_code=403, detail="CSRF validation failed")


def current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> User:
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == _token_hash(session_token),
            UserSession.expires_at > datetime.now(UTC),
        )
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    return db.get(User, session.user_id)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(auth_rate_limit)])
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)) -> User:
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(email=email, password_hash=_hash_password(payload.password), display_name=payload.display_name.strip())
    db.add(user)
    db.commit()
    db.refresh(user)
    _set_session_cookie(response, _create_session(db, user.id))
    return user


@router.post("/login", response_model=UserResponse, dependencies=[Depends(auth_rate_limit)])
def login(payload: Credentials, response: Response, db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not _verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    _set_session_cookie(response, _create_session(db, user.id))
    return user


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(current_user)) -> User:
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
    _csrf: None = Depends(verify_csrf),
) -> None:
    if session_token:
        session = db.get(UserSession, _token_hash(session_token))
        if session is not None:
            db.delete(session)
            db.commit()
    response.delete_cookie(SESSION_COOKIE)
    response.delete_cookie(CSRF_COOKIE)
