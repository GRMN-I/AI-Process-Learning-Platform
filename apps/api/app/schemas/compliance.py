import uuid
from datetime import date, datetime

from pydantic import BaseModel


class ComplianceReadMarkOut(BaseModel):
    id: uuid.UUID
    read_status: str
    read_at: datetime | None
    read_procedure_version_id: uuid.UUID | None


class ComplianceOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    procedure_id: uuid.UUID
    procedure_title: str
    procedure_version_id: uuid.UUID | None
    read_procedure_version_id: uuid.UUID | None
    read_status: str
    read_at: datetime | None
    version_number: int | None = None
    training_id: uuid.UUID | None
    training_title: str | None = None
    training_status: str
    assignment_id: uuid.UUID | None
    role_assignment_id: uuid.UUID | None
    role_name: str | None = None
    status: str
    due_date: date | None
    completed_at: datetime | None
    last_score: int | None
    evidence_json: dict | None
    updated_at: datetime
