"""Persist lesson experiment challenge completion."""
from alembic import op
import sqlalchemy as sa

revision = "0004_completed_challenges"
down_revision = "0003_solved_exercises"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "completed_challenges",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("challenge_id", sa.String(120), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "challenge_id", name="uq_completed_challenge_user_challenge"),
    )
    op.create_index("ix_completed_challenges_user_id", "completed_challenges", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_table("completed_challenges")
