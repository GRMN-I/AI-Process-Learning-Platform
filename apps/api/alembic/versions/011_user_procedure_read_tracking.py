"""Add read tracking to user procedure compliance

Revision ID: 011_user_procedure_read_tracking
Revises: 645ce4fe7f26
Create Date: 2026-03-19
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011_user_procedure_read_tracking"
down_revision: Union[str, None] = "645ce4fe7f26"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "user_procedure_compliance",
        sa.Column("read_procedure_version_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "user_procedure_compliance",
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "user_procedure_compliance_read_procedure_version_id_fkey",
        "user_procedure_compliance",
        "procedure_versions",
        ["read_procedure_version_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "user_procedure_compliance_read_procedure_version_id_fkey",
        "user_procedure_compliance",
        type_="foreignkey",
    )
    op.drop_column("user_procedure_compliance", "read_at")
    op.drop_column("user_procedure_compliance", "read_procedure_version_id")
