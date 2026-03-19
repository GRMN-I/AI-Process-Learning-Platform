"""Add updated_at to users and roles

Revision ID: 009_user_role_updated_at
Revises: 008_incident_findings
Create Date: 2026-03-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_user_role_updated_at"
down_revision: Union[str, None] = "008_incident_findings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("roles", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))

    op.execute("UPDATE users SET updated_at = created_at WHERE updated_at IS NULL")
    op.execute("UPDATE roles SET updated_at = created_at WHERE updated_at IS NULL")

    op.alter_column("users", "updated_at", nullable=False)
    op.alter_column("roles", "updated_at", nullable=False)


def downgrade() -> None:
    op.drop_column("roles", "updated_at")
    op.drop_column("users", "updated_at")
