from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_user, verify_csrf
from app.database import get_db
from app.models import (
    ActivityEvent,
    AssessmentAttempt,
    Bookmark,
    ChallengeAttempt,
    CompletedChallenge,
    LessonProgress,
    Note,
    SolvedExercise,
    User,
)

router = APIRouter(prefix="/api/v1/progress", tags=["progress"])


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


class AttemptPayload(BaseModel):
    id: str | None = None
    exercise_id: str = Field(min_length=1, max_length=120)
    answer: str = Field(max_length=4000)
    correct: bool
    attempted_at: datetime | None = None


class NoteConflictPayload(BaseModel):
    local_body: str
    server_body: str
    server_updated_at: datetime


class ChallengeAttemptPayload(BaseModel):
    id: str | None = None
    challenge_id: str = Field(min_length=1, max_length=120)
    reflection: str = Field(default="", max_length=4000)
    completed_at: datetime | None = None


class ProgressSnapshot(BaseModel):
    completed_lessons: list[str] = Field(default_factory=list, max_length=500)
    completed_challenges: list[str] = Field(default_factory=list, max_length=500)
    solved_exercises: list[str] = Field(default_factory=list, max_length=500)
    bookmarks: list[str] = Field(default_factory=list, max_length=500)
    notes: dict[str, str] = Field(default_factory=dict, max_length=500)
    note_versions: dict[str, datetime] = Field(default_factory=dict, max_length=500)
    note_conflicts: dict[str, NoteConflictPayload] = Field(default_factory=dict, max_length=500)
    challenge_attempts: list[ChallengeAttemptPayload] = Field(default_factory=list, max_length=500)
    attempts: list[AttemptPayload] = Field(default_factory=list, max_length=500)


def _snapshot(db: Session, user_id: str) -> ProgressSnapshot:
    completed = db.scalars(select(LessonProgress.lesson_id).where(LessonProgress.user_id == user_id)).all()
    challenges = db.scalars(select(CompletedChallenge.challenge_id).where(CompletedChallenge.user_id == user_id)).all()
    solved = db.scalars(select(SolvedExercise.exercise_id).where(SolvedExercise.user_id == user_id)).all()
    bookmarks = db.scalars(select(Bookmark.target_id).where(Bookmark.user_id == user_id)).all()
    notes = db.scalars(select(Note).where(Note.user_id == user_id)).all()
    attempts = db.scalars(
        select(AssessmentAttempt)
        .where(AssessmentAttempt.user_id == user_id)
        .order_by(AssessmentAttempt.attempted_at.desc())
        .limit(500)
    ).all()
    challenge_attempts = db.scalars(
        select(ChallengeAttempt)
        .where(ChallengeAttempt.user_id == user_id)
        .order_by(ChallengeAttempt.completed_at.desc())
        .limit(500)
    ).all()
    return ProgressSnapshot(
        completed_lessons=list(completed),
        completed_challenges=list(challenges),
        solved_exercises=list(solved),
        bookmarks=list(bookmarks),
        notes={note.lesson_id: note.body for note in notes},
        note_versions={
            note.lesson_id: note.updated_at
            for note in notes
            if note.updated_at is not None
        },
        challenge_attempts=[
            ChallengeAttemptPayload(
                id=attempt.id,
                challenge_id=attempt.challenge_id,
                reflection=attempt.reflection,
                completed_at=attempt.completed_at,
            )
            for attempt in challenge_attempts
        ],
        attempts=[
            AttemptPayload(
                id=attempt.id,
                exercise_id=attempt.exercise_id,
                answer=attempt.answer,
                correct=attempt.correct,
                attempted_at=attempt.attempted_at,
            )
            for attempt in attempts
        ],
    )


@router.get("", response_model=ProgressSnapshot)
def get_progress(user: User = Depends(current_user), db: Session = Depends(get_db)) -> ProgressSnapshot:
    return _snapshot(db, user.id)


@router.put("", response_model=ProgressSnapshot)
def sync_progress(
    payload: ProgressSnapshot,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(verify_csrf),
) -> ProgressSnapshot:
    existing_lessons = set(db.scalars(select(LessonProgress.lesson_id).where(LessonProgress.user_id == user.id)))
    for lesson_id in set(payload.completed_lessons) - existing_lessons:
        db.add(LessonProgress(user_id=user.id, lesson_id=lesson_id))
        db.add(ActivityEvent(user_id=user.id, label="Lesson completed", detail=lesson_id, kind="lesson_completed"))

    existing_solved = set(db.scalars(select(SolvedExercise.exercise_id).where(SolvedExercise.user_id == user.id)))
    for exercise_id in set(payload.solved_exercises) - existing_solved:
        db.add(SolvedExercise(user_id=user.id, exercise_id=exercise_id))

    existing_challenges = set(db.scalars(select(CompletedChallenge.challenge_id).where(CompletedChallenge.user_id == user.id)))
    for challenge_id in set(payload.completed_challenges) - existing_challenges:
        db.add(CompletedChallenge(user_id=user.id, challenge_id=challenge_id))
        db.add(ActivityEvent(user_id=user.id, label="Challenge completed", detail=challenge_id, kind="challenge_completed"))

    existing_challenge_attempts = set(
        db.scalars(select(ChallengeAttempt.id).where(ChallengeAttempt.user_id == user.id))
    )
    for attempt in payload.challenge_attempts:
        attempt_id = attempt.id or None
        if attempt_id and attempt_id in existing_challenge_attempts:
            continue
        db.add(
            ChallengeAttempt(
                id=attempt_id,
                user_id=user.id,
                challenge_id=attempt.challenge_id,
                reflection=attempt.reflection,
                completed_at=attempt.completed_at or datetime.now(UTC),
            )
        )
        db.add(ActivityEvent(user_id=user.id, label="Experiment recorded", detail=attempt.challenge_id, kind="challenge_attempted"))

    existing_bookmarks = set(db.scalars(select(Bookmark.target_id).where(Bookmark.user_id == user.id)))
    for target_id in set(payload.bookmarks) - existing_bookmarks:
        db.add(Bookmark(user_id=user.id, target_id=target_id))

    conflicts: dict[str, NoteConflictPayload] = {}
    for lesson_id, body in payload.notes.items():
        note = db.scalar(select(Note).where(Note.user_id == user.id, Note.lesson_id == lesson_id))
        if note is None:
            db.add(Note(user_id=user.id, lesson_id=lesson_id, body=body))
        else:
            client_version = payload.note_versions.get(lesson_id)
            server_version = note.updated_at
            if (
                client_version is not None
                and server_version is not None
                and _utc(server_version) > _utc(client_version)
                and note.body != body
            ):
                conflicts[lesson_id] = NoteConflictPayload(
                    local_body=body,
                    server_body=note.body,
                    server_updated_at=server_version,
                )
                continue
            if note.body == body:
                continue
            note.body = body
            note.updated_at = datetime.now(UTC)

    existing_attempts = set(db.scalars(select(AssessmentAttempt.id).where(AssessmentAttempt.user_id == user.id)))
    for attempt in payload.attempts:
        attempt_id = attempt.id or None
        if attempt_id and attempt_id in existing_attempts:
            continue
        db.add(
            AssessmentAttempt(
                id=attempt_id,
                user_id=user.id,
                exercise_id=attempt.exercise_id,
                answer=attempt.answer,
                correct=attempt.correct,
                attempted_at=attempt.attempted_at or datetime.now(UTC),
            )
        )
        db.add(ActivityEvent(user_id=user.id, label="Practice submitted", detail=attempt.exercise_id, kind="practice_attempt"))

    db.commit()
    snapshot = _snapshot(db, user.id)
    snapshot.note_conflicts = conflicts
    return snapshot
