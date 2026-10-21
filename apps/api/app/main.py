import os
from datetime import UTC, datetime
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.activity import router as activity_router
from app.analytics import router as analytics_router
from app.auth import router as auth_router
from app.missions import router as missions_router
from app.practice import router as practice_router
from app.progress import router as progress_router
from app.terminal import router as terminal_router


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    timestamp: datetime


class ContentSummary(BaseModel):
    id: str
    title: str
    lesson_count: int = Field(ge=0)


class CurriculumResponse(BaseModel):
    version: str
    modules: list[ContentSummary]


app = FastAPI(title="OS A2Z API", version="0.1.0")
cors_origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://127.0.0.1:5175,http://localhost:5175").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["DELETE", "GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
)
app.include_router(auth_router)
app.include_router(analytics_router)
app.include_router(progress_router)
app.include_router(practice_router)
app.include_router(activity_router)
app.include_router(terminal_router)
app.include_router(missions_router)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


@app.get("/api/v1/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="os-a2z-api", timestamp=datetime.now(UTC))


@app.get("/api/v1/curriculum", response_model=CurriculumResponse, tags=["curriculum"])
def curriculum() -> CurriculumResponse:
    return CurriculumResponse(
        version="2026.10.21",
        modules=[
            ContentSummary(id="m1", title="Linux & Terminal Fundamentals", lesson_count=3),
            ContentSummary(id="m2", title="Files & Directories", lesson_count=3),
            ContentSummary(id="m3", title="Users, Groups & Permissions", lesson_count=3),
            ContentSummary(id="m4", title="Processes & Job Control", lesson_count=3),
            ContentSummary(id="m5", title="CPU Scheduling", lesson_count=3),
            ContentSummary(id="m6", title="Memory, Virtual Memory & Paging", lesson_count=3),
            ContentSummary(id="m7", title="Synchronization", lesson_count=3),
            ContentSummary(id="m8", title="Deadlocks", lesson_count=3),
            ContentSummary(id="m9", title="Storage, Disks & Filesystems", lesson_count=3),
            ContentSummary(id="m10", title="Shell Scripting", lesson_count=3),
            ContentSummary(id="m11", title="Networking & IPC", lesson_count=3),
            ContentSummary(id="m12", title="OS Internals & Advanced Topics", lesson_count=3),
        ],
    )
