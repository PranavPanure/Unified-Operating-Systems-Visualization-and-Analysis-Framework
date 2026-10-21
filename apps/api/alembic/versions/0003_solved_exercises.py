"""Persist exercise completion separately from attempts."""
from alembic import op
import sqlalchemy as sa

revision = "0003_solved_exercises"
down_revision = "0002_user_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "solved_exercises",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("exercise_id", sa.String(120), nullable=False),
        sa.Column("solved_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "exercise_id", name="uq_solved_exercise_user_exercise"),
    )
    op.create_index("ix_solved_exercises_user_id", "solved_exercises", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_table("solved_exercises")
