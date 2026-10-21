from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import current_user
from app.database import get_db
from app.models import ActivityEvent, User

router = APIRouter(prefix="/api/v1/activity", tags=["activity"])


class ActivityItem(BaseModel):
    id: str
    label: str
    detail: str
    kind: str
    created_at: datetime


class ActivityHistory(BaseModel):
    events: list[ActivityItem] = Field(max_length=100)


@router.get("", response_model=ActivityHistory)
def get_activity(
    limit: int = Query(default=20, ge=1, le=100),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> ActivityHistory:
    events = db.scalars(
        select(ActivityEvent)
        .where(ActivityEvent.user_id == user.id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(limit)
    ).all()
    return ActivityHistory(
        events=[
            ActivityItem(
                id=event.id,
                label=event.label,
                detail=event.detail,
                kind=event.kind,
                created_at=(
                    event.created_at.replace(tzinfo=UTC)
                    if event.created_at.tzinfo is None
                    else event.created_at
                ),
            )
            for event in events
        ]
    )
