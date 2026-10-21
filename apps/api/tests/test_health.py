import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import get_db
from app.main import app
from app.models import AssessmentAttempt, Base, User
from app.repositories.progress import record_attempt, upsert_note
from app.terminal import (
    RATE_LIMIT_PER_USER,
    TerminalExecuteRequest,
    _check_rate_limit,
    _docker_args,
)

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


def test_curriculum_endpoint_has_twelve_modules() -> None:
    response = client.get("/api/v1/curriculum")
    assert response.status_code == 200
    assert len(response.json()["modules"]) == 12
    assert {module["lesson_count"] for module in response.json()["modules"]} == {3}


def test_persistence_schema_supports_progress_records() -> None:
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    assert set(inspect(engine).get_table_names()) == {
        "users",
        "lesson_progress",
        "bookmarks",
        "notes",
        "assessment_attempts",
        "activity_events",
        "user_sessions",
        "solved_exercises",
        "completed_challenges",
        "challenge_attempts",
    }
    with Session(engine) as db:
        user = User(email="student@example.com", password_hash="test-only", display_name="Student")
        db.add(user)
        db.commit()
        db.refresh(user)
        record_attempt(db, user.id, "ex-shell-1", "pwd", True)
        note = upsert_note(db, user.id, "shell-model", "The shell is a program.")
        assert db.query(AssessmentAttempt).count() == 1
        assert note.body == "The shell is a program."


@pytest.fixture
def auth_client():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    def override_get_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_auth_register_login_me_and_logout(auth_client) -> None:
    registered = auth_client.post(
        "/api/v1/auth/register",
        json={"email": "student@example.com", "password": "correct horse", "display_name": "Student"},
    )
    assert registered.status_code == 201
    assert registered.json()["email"] == "student@example.com"
    assert auth_client.get("/api/v1/auth/me").status_code == 200
    csrf_headers = {"X-CSRF-Token": auth_client.cookies.get("os_a2z_csrf")}
    synced = auth_client.put(
        "/api/v1/progress",
        headers=csrf_headers,
        json={
            "completed_lessons": ["shell-model"],
            "completed_challenges": ["shell-model"],
            "challenge_attempts": [{"id": "challenge-attempt-1", "challenge_id": "shell-model", "reflection": "The shell changed cwd before pwd printed it."}],
            "solved_exercises": ["ex-shell-1"],
            "bookmarks": ["shell-model"],
            "notes": {"shell-model": "The shell parses commands."},
            "attempts": [{"id": "attempt-1", "exercise_id": "ex-shell-1", "answer": "pwd", "correct": True}],
        },
    )
    assert synced.status_code == 200
    assert synced.json()["completed_lessons"] == ["shell-model"]
    assert synced.json()["completed_challenges"] == ["shell-model"]
    assert synced.json()["challenge_attempts"][0]["challenge_id"] == "shell-model"
    practice_history = auth_client.get("/api/v1/practice/attempts?limit=1")
    assert practice_history.status_code == 200
    assert practice_history.json()["attempts"][0]["exercise_id"] == "ex-shell-1"
    activity = auth_client.get("/api/v1/activity?limit=10")
    assert activity.status_code == 200
    assert {event["kind"] for event in activity.json()["events"]} >= {
        "lesson_completed",
        "challenge_completed",
        "challenge_attempted",
        "practice_attempt",
    }
    assert auth_client.get("/api/v1/progress").json()["completed_challenges"] == ["shell-model"]
    initial = auth_client.get("/api/v1/progress").json()
    assert initial["notes"]["shell-model"] == "The shell parses commands."
    initial_version = initial["note_versions"]["shell-model"]

    updated = auth_client.put(
        "/api/v1/progress",
        headers=csrf_headers,
        json={"notes": {"shell-model": "The shell parses tokens."}, "note_versions": {"shell-model": initial_version}},
    )
    assert updated.status_code == 200
    current = auth_client.get("/api/v1/progress").json()
    assert current["notes"]["shell-model"] == "The shell parses tokens."

    stale = auth_client.put(
        "/api/v1/progress",
        headers=csrf_headers,
        json={"notes": {"shell-model": "A stale edit."}, "note_versions": {"shell-model": initial_version}},
    )
    assert stale.status_code == 200
    assert stale.json()["notes"]["shell-model"] == "The shell parses tokens."
    assert stale.json()["note_conflicts"]["shell-model"]["local_body"] == "A stale edit."

    assert auth_client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": "wrong"}).status_code == 403
    logged_out = auth_client.post("/api/v1/auth/logout", headers=csrf_headers)
    assert logged_out.status_code == 204
    assert auth_client.get("/api/v1/auth/me").status_code == 401

    logged_in = auth_client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "correct horse"},
    )
    assert logged_in.status_code == 200
    assert auth_client.get("/api/v1/auth/me").json()["display_name"] == "Student"


def test_auth_rejects_duplicate_and_invalid_credentials(auth_client) -> None:
    payload = {"email": "student@example.com", "password": "correct horse", "display_name": "Student"}
    assert auth_client.post("/api/v1/auth/register", json=payload).status_code == 201
    assert auth_client.post("/api/v1/auth/register", json=payload).status_code == 409
    assert auth_client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "wrong password"},
    ).status_code == 401


def test_terminal_execution_requires_auth(auth_client) -> None:
    response = auth_client.post(
        "/api/v1/terminal/execute",
        json={"command": "printf 'hello\\n'"},
    )
    assert response.status_code == 401


def test_terminal_sessions_are_validated_and_mounted() -> None:
    payload = TerminalExecuteRequest(command="touch lesson.txt", session_id="session_123")
    args = _docker_args(payload, "run-name", "os-a2z-ws-test")
    assert "--mount" in args
    assert "type=volume,source=os-a2z-ws-test,target=/workspace" in args
    with pytest.raises(ValueError):
        TerminalExecuteRequest(command="pwd", session_id="bad/id")


def test_linux_missions_are_published_and_validation_requires_auth(auth_client) -> None:
    response = auth_client.get("/api/v1/missions")
    assert response.status_code == 200
    assert response.json()[0]["id"] == "linux-files-01"
    response = auth_client.post(
        "/api/v1/missions/validate",
        json={"mission_id": "linux-files-01", "stdout": "process-ready\n", "exit_code": 0},
    )
    assert response.status_code == 401


def test_terminal_rate_limit_is_per_user() -> None:
    user_id = "rate-limit-test-user"
    for _ in range(RATE_LIMIT_PER_USER):
        _check_rate_limit(user_id)
    response = None
    try:
        _check_rate_limit(user_id)
    except Exception as error:  # noqa: BLE001 - assert the framework exception without executing a container
        response = error
    assert getattr(response, "status_code", None) == 429
