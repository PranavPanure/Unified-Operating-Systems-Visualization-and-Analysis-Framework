from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.database import get_db
from app.models import (
    AssessmentAttempt,
    ChallengeAttempt,
    CompletedChallenge,
    LessonProgress,
    SolvedExercise,
    User,
)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


class RecentReflection(BaseModel):
    challenge_id: str
    reflection: str
    completed_at: str


class AnalyticsSummary(BaseModel):
    completed_lessons: int = Field(ge=0)
    completed_challenges: int = Field(ge=0)
    challenge_attempts: int = Field(ge=0)
    reflections: int = Field(ge=0)
    solved_exercises: int = Field(ge=0)
    practice_attempts: int = Field(ge=0)
    practice_accuracy: int = Field(ge=0, le=100)
    recent_reflections: list[RecentReflection] = Field(max_length=20)


@router.get("", response_model=AnalyticsSummary)
def get_analytics(user: User = Depends(current_user), db: Session = Depends(get_db)) -> AnalyticsSummary:
    completed_lessons = db.scalars(
        select(LessonProgress.lesson_id).where(LessonProgress.user_id == user.id)
    ).all()
    completed_challenges = db.scalars(
        select(CompletedChallenge.challenge_id).where(CompletedChallenge.user_id == user.id)
    ).all()
    challenge_attempts = db.scalars(
        select(ChallengeAttempt)
        .where(ChallengeAttempt.user_id == user.id)
        .order_by(ChallengeAttempt.completed_at.desc())
        .limit(500)
    ).all()
    practice_attempts = db.scalars(
        select(AssessmentAttempt)
        .where(AssessmentAttempt.user_id == user.id)
        .order_by(AssessmentAttempt.attempted_at.desc())
        .limit(500)
    ).all()
    correct = sum(1 for attempt in practice_attempts if attempt.correct)
    return AnalyticsSummary(
        completed_lessons=len(completed_lessons),
        completed_challenges=len(completed_challenges),
        challenge_attempts=len(challenge_attempts),
        reflections=sum(1 for attempt in challenge_attempts if attempt.reflection.strip()),
        solved_exercises=len(
            db.scalars(select(SolvedExercise.exercise_id).where(SolvedExercise.user_id == user.id)).all()
        ),
        practice_attempts=len(practice_attempts),
        practice_accuracy=round(correct / len(practice_attempts) * 100) if practice_attempts else 0,
        recent_reflections=[
            RecentReflection(
                challenge_id=attempt.challenge_id,
                reflection=attempt.reflection,
                completed_at=attempt.completed_at.isoformat(),
            )
            for attempt in challenge_attempts
            if attempt.reflection.strip()
        ][:20],
    )
