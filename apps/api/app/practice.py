from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.database import get_db
from app.models import AssessmentAttempt, User

router = APIRouter(prefix="/api/v1/practice", tags=["practice"])


class PracticeAttemptItem(BaseModel):
    id: str
    exercise_id: str
    answer: str
    correct: bool
    attempted_at: datetime


class PracticeAttemptHistory(BaseModel):
    attempts: list[PracticeAttemptItem] = Field(max_length=100)


@router.get("/attempts", response_model=PracticeAttemptHistory)
def get_attempt_history(
    limit: int = Query(default=50, ge=1, le=100),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> PracticeAttemptHistory:
    attempts = db.scalars(
        select(AssessmentAttempt)
        .where(AssessmentAttempt.user_id == user.id)
        .order_by(AssessmentAttempt.attempted_at.desc())
        .limit(limit)
    ).all()
    return PracticeAttemptHistory(
        attempts=[
            PracticeAttemptItem(
                id=attempt.id,
                exercise_id=attempt.exercise_id,
                answer=attempt.answer,
                correct=attempt.correct,
                attempted_at=(
                    attempt.attempted_at.replace(tzinfo=UTC)
                    if attempt.attempted_at.tzinfo is None
                    else attempt.attempted_at
                ),
            )
            for attempt in attempts
        ]
    )
