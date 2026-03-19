"""merge parallel heads

Revision ID: 645ce4fe7f26
Revises: 009_user_role_updated_at, 010_incident_status_workflow
Create Date: 2026-03-19 09:15:24.599610

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '645ce4fe7f26'
down_revision: Union[str, None] = ('009_user_role_updated_at', '010_incident_status_workflow')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
