import re

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_user, verify_csrf
from app.database import get_db
from app.models import ActivityEvent, CompletedChallenge, User

router = APIRouter(prefix="/api/v1/missions", tags=["missions"])

MISSIONS = [
    {
        "id": "linux-files-01",
        "title": "Create a workspace file",
        "module": "Linux & Terminal Fundamentals",
        "objective": "Create lab/status.txt and write process-ready into it.",
        "hint": "mkdir -p lab && printf 'process-ready\\n' > lab/status.txt",
        "expected_output": "process-ready",
    },
    {
        "id": "linux-pipeline-01",
        "title": "Build a pipeline",
        "module": "Linux & Terminal Fundamentals",
        "objective": "Use a pipeline to transform the word operating-systems to uppercase.",
        "hint": "printf 'operating-systems\\n' | tr a-z A-Z",
        "expected_output": "OPERATING-SYSTEMS",
    },
    {
        "id": "linux-process-01",
        "title": "Inspect the current process",
        "module": "Processes & Job Control",
        "objective": "Print the current shell PID and prove the process is running as learner.",
        "hint": "printf '%s\\n' $$; whoami",
        "expected_output": "learner",
    },
]
MISSION_BY_ID = {mission["id"]: mission for mission in MISSIONS}


class MissionResult(BaseModel):
    mission_id: str = Field(min_length=1, max_length=120)
    stdout: str = Field(default="", max_length=12_000)
    exit_code: int | None = Field(default=None, ge=-255, le=255)


class MissionValidation(BaseModel):
    mission_id: str
    passed: bool
    message: str


@router.get("")
def list_missions() -> list[dict[str, str]]:
    return MISSIONS


@router.post("/validate", response_model=MissionValidation)
def validate_mission(
    payload: MissionResult,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(verify_csrf),
) -> MissionValidation:
    mission = MISSION_BY_ID.get(payload.mission_id)
    if mission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission not found")
    passed = payload.exit_code == 0 and re.search(re.escape(mission["expected_output"]), payload.stdout) is not None
    if passed:
        existing = db.scalar(
            select(CompletedChallenge).where(
                CompletedChallenge.user_id == user.id,
                CompletedChallenge.challenge_id == mission["id"],
            )
        )
        if existing is None:
            db.add(CompletedChallenge(user_id=user.id, challenge_id=mission["id"]))
            db.add(ActivityEvent(user_id=user.id, label="Linux mission completed", detail=mission["id"], kind="challenge_completed"))
            db.commit()
        return MissionValidation(mission_id=mission["id"], passed=True, message="Mission complete. Explain why the command produced this output.")
    return MissionValidation(mission_id=mission["id"], passed=False, message="Not yet. Check the exit code and compare the output with the mission objective.")
