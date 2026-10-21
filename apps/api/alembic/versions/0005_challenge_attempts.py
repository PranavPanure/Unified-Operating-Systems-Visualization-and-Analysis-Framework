"""Persist challenge reflections and completion timestamps."""
from alembic import op
import sqlalchemy as sa

revision = "0005_challenge_attempts"
down_revision = "0004_completed_challenges"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "challenge_attempts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("challenge_id", sa.String(120), nullable=False),
        sa.Column("reflection", sa.Text, nullable=False, server_default=""),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_challenge_attempts_user_id", "challenge_attempts", ["user_id"], unique=False)
    op.create_index("ix_challenge_attempts_user_completed", "challenge_attempts", ["user_id", "completed_at"], unique=False)


def downgrade() -> None:
    op.drop_table("challenge_attempts")
