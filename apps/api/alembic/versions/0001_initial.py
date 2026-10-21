"""Create OS A2Z persistence tables."""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("users", sa.Column("id", sa.String(36), primary_key=True), sa.Column("email", sa.String(320), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("display_name", sa.String(120), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.UniqueConstraint("email"))
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_table("lesson_progress", sa.Column("id", sa.Integer, primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("lesson_id", sa.String(120), nullable=False), sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.UniqueConstraint("user_id", "lesson_id", name="uq_lesson_progress_user_lesson"))
    op.create_index("ix_lesson_progress_user_id", "lesson_progress", ["user_id"], unique=False)
    op.create_table("bookmarks", sa.Column("id", sa.Integer, primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("target_id", sa.String(120), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.UniqueConstraint("user_id", "target_id", name="uq_bookmark_user_target"))
    op.create_index("ix_bookmarks_user_id", "bookmarks", ["user_id"], unique=False)
    op.create_table("notes", sa.Column("id", sa.Integer, primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("lesson_id", sa.String(120), nullable=False), sa.Column("body", sa.Text, nullable=False), sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.UniqueConstraint("user_id", "lesson_id", name="uq_note_user_lesson"))
    op.create_index("ix_notes_user_id", "notes", ["user_id"], unique=False)
    op.create_table("assessment_attempts", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("exercise_id", sa.String(120), nullable=False), sa.Column("answer", sa.Text, nullable=False), sa.Column("correct", sa.Boolean, nullable=False), sa.Column("attempted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_assessment_attempts_user_id", "assessment_attempts", ["user_id"], unique=False)
    op.create_index("ix_attempts_user_exercise", "assessment_attempts", ["user_id", "exercise_id"], unique=False)
    op.create_table("activity_events", sa.Column("id", sa.String(36), primary_key=True), sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False), sa.Column("label", sa.String(120), nullable=False), sa.Column("detail", sa.Text, nullable=False), sa.Column("kind", sa.String(32), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_activity_events_user_id", "activity_events", ["user_id"], unique=False)
    op.create_index("ix_activity_user_created", "activity_events", ["user_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_table("activity_events")
    op.drop_table("assessment_attempts")
    op.drop_table("notes")
    op.drop_table("bookmarks")
    op.drop_table("lesson_progress")
    op.drop_table("users")
