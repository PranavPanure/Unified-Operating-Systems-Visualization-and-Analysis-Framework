import hashlib
import os
import re
import shutil
import subprocess
import threading
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.auth import current_user, verify_csrf
from app.models import User

router = APIRouter(prefix="/api/v1/terminal", tags=["terminal"])
SANDBOX_IMAGE = os.getenv("SANDBOX_IMAGE", "os-a2z-linux-sandbox:latest")
SANDBOX_RUNTIME = os.getenv("SANDBOX_RUNTIME", "auto")
MAX_OUTPUT = 12_000
RATE_WINDOW_SECONDS = 60
RATE_LIMIT_PER_USER = 30
_rate_lock = threading.Lock()
_recent_runs: dict[str, deque[float]] = defaultdict(deque)


class TerminalExecuteRequest(BaseModel):
    command: str = Field(min_length=1, max_length=2_000)
    cwd: str = Field(default="/workspace", min_length=1, max_length=200)
    timeout_ms: int = Field(default=4_000, ge=100, le=8_000)
    session_id: str | None = Field(default=None, max_length=64)

    @field_validator("command")
    @classmethod
    def command_has_no_nul(cls, value: str) -> str:
        if "\x00" in value:
            raise ValueError("Command contains an invalid null byte")
        return value.strip()

    @field_validator("cwd")
    @classmethod
    def cwd_is_sandboxed(cls, value: str) -> str:
        if not value.startswith("/workspace") or ".." in value.split("/"):
            raise ValueError("Working directory must stay under /workspace")
        return value.rstrip("/") or "/workspace"

    @field_validator("session_id")
    @classmethod
    def session_id_is_safe(cls, value: str | None) -> str | None:
        if value is not None and not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", value):
            raise ValueError("Session ID must contain 8-64 letters, numbers, underscores, or hyphens")
        return value


class TerminalExecuteResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int | None
    timed_out: bool
    duration_ms: int
    sandbox: str
    session_id: str


def _session_id(payload: TerminalExecuteRequest) -> str:
    return payload.session_id or uuid.uuid4().hex


def _volume_name(user: User, session_id: str) -> str:
    digest = hashlib.sha256(f"{user.id}:{session_id}".encode()).hexdigest()[:24]
    return f"os-a2z-ws-{digest}"


def _docker_args(payload: TerminalExecuteRequest, name: str, volume_name: str) -> list[str]:
    bounded_shell = 'ulimit -f 1024; ulimit -t 5; eval "$1"'
    runtime = _runtime()
    return [
        runtime,
        "run",
        "--rm",
        "--name",
        name,
        "--network",
        "none",
        "--read-only",
        "--mount",
        f"type=volume,source={volume_name},target=/workspace",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=16m",
        "--tmpfs",
        "/home/learner:rw,nosuid,size=16m",
        "--pids-limit",
        "64",
        "--memory",
        "128m",
        "--cpus",
        "0.5",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges:true",
        "--user",
        "1000:1000",
        "--workdir",
        payload.cwd,
        SANDBOX_IMAGE,
        "/bin/sh",
        "-lc",
        bounded_shell,
        "os-a2z-shell",
        payload.command,
    ]


def _runtime() -> str:
    if SANDBOX_RUNTIME != "auto":
        return SANDBOX_RUNTIME
    for candidate in ("podman", "docker"):
        if shutil.which(candidate):
            return candidate
    raise FileNotFoundError("No container runtime found")


def _check_rate_limit(user_id: str) -> None:
    now = time.monotonic()
    with _rate_lock:
        runs = _recent_runs[user_id]
        while runs and now - runs[0] >= RATE_WINDOW_SECONDS:
            runs.popleft()
        if len(runs) >= RATE_LIMIT_PER_USER:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Terminal rate limit reached. Try again in a minute.",
                headers={"Retry-After": str(RATE_WINDOW_SECONDS)},
            )
        runs.append(now)


@router.post("/execute", response_model=TerminalExecuteResponse)
def execute_terminal(
    payload: TerminalExecuteRequest,
    user: User = Depends(current_user),
    _csrf: None = Depends(verify_csrf),
) -> TerminalExecuteResponse:
    _check_rate_limit(user.id)
    session_id = _session_id(payload)
    volume_name = _volume_name(user, session_id)
    name = f"os-a2z-run-{uuid.uuid4().hex[:12]}"
    started = datetime.now().timestamp()
    runtime = "unknown"
    try:
        runtime = _runtime()
        completed = subprocess.run(
            _docker_args(payload, name, volume_name),
            capture_output=True,
            text=True,
            timeout=payload.timeout_ms / 1000,
            check=False,
        )
        timed_out = False
        exit_code = completed.returncode
        stdout = completed.stdout
        stderr = completed.stderr
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Linux sandbox is unavailable because Docker/Podman is not installed or not running.",
        ) from error
    except subprocess.TimeoutExpired as error:
        subprocess.run([_runtime(), "rm", "-f", name], capture_output=True, timeout=2, check=False)
        timed_out = True
        exit_code = None
        stdout = error.stdout or ""
        stderr = (error.stderr or "") + "Command exceeded the sandbox time limit."
    except subprocess.SubprocessError as error:
        raise HTTPException(status_code=503, detail="Linux sandbox failed to start safely.") from error
    duration_ms = round((datetime.now().timestamp() - started) * 1000)
    return TerminalExecuteResponse(
        stdout=str(stdout)[-MAX_OUTPUT:],
        stderr=str(stderr)[-MAX_OUTPUT:],
        exit_code=exit_code,
        timed_out=timed_out,
        duration_ms=duration_ms,
        sandbox=f"{runtime}-non-root-network-disabled",
        session_id=session_id,
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def reset_terminal_session(
    session_id: str,
    user: User = Depends(current_user),
    _csrf: None = Depends(verify_csrf),
) -> None:
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", session_id):
        raise HTTPException(status_code=422, detail="Invalid session ID")
    try:
        subprocess.run([_runtime(), "volume", "rm", _volume_name(user, session_id)], capture_output=True, timeout=5, check=False)
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail="Linux sandbox runtime is unavailable.") from error
