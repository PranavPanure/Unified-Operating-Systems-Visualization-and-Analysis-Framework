from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AssessmentAttempt, Bookmark, LessonProgress, Note


def completed_lesson_ids(db: Session, user_id: str) -> list[str]:
    return list(
        db.scalars(select(LessonProgress.lesson_id).where(LessonProgress.user_id == user_id)).all()
    )


def record_attempt(
    db: Session, user_id: str, exercise_id: str, answer: str, correct: bool
) -> AssessmentAttempt:
    attempt = AssessmentAttempt(
        user_id=user_id, exercise_id=exercise_id, answer=answer, correct=correct
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def upsert_note(db: Session, user_id: str, lesson_id: str, body: str) -> Note:
    note = db.scalar(select(Note).where(Note.user_id == user_id, Note.lesson_id == lesson_id))
    if note is None:
        note = Note(user_id=user_id, lesson_id=lesson_id, body=body)
        db.add(note)
    else:
        note.body = body
    db.commit()
    db.refresh(note)
    return note


def add_bookmark(db: Session, user_id: str, target_id: str) -> Bookmark:
    bookmark = db.scalar(
        select(Bookmark).where(Bookmark.user_id == user_id, Bookmark.target_id == target_id)
    )
    if bookmark is None:
        bookmark = Bookmark(user_id=user_id, target_id=target_id)
        db.add(bookmark)
        db.commit()
        db.refresh(bookmark)
    return bookmark
