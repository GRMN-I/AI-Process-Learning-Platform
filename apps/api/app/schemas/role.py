import uuid
from datetime import date, datetime

from pydantic import BaseModel


class RoleCreate(BaseModel):
    code: str
    name: str
    description: str | None = None


class RoleUpdate(BaseModel):
    code: str
    name: str
    description: str | None = None
    is_active: bool = True


class RoleTaskRef(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    task_title: str
    is_required: bool


class RoleProcedureRef(BaseModel):
    id: uuid.UUID
    procedure_id: uuid.UUID
    procedure_code: str
    procedure_title: str
    is_required: bool


class RoleOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    procedure_count: int = 0

    model_config = {"from_attributes": True}


class RoleDetailOut(RoleOut):
    tasks: list[RoleTaskRef] = []
    procedures: list[RoleProcedureRef] = []


class UserRoleAssignmentCreate(BaseModel):
    user_id: uuid.UUID
    role_id: uuid.UUID
    location: str | None = None
    status: str = "active"
    starts_on: date | None = None
    ends_on: date | None = None


class UserRoleAssignmentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    role_id: uuid.UUID
    role_name: str
    role_code: str
    location: str | None
    status: str
    starts_on: date | None
    ends_on: date | None
    created_at: datetime


class RoleTaskLinkCreate(BaseModel):
    role_id: uuid.UUID
    task_id: uuid.UUID
    is_required: bool = True


class RoleTaskLinkOut(BaseModel):
    id: uuid.UUID
    role_id: uuid.UUID
    role_name: str
    task_id: uuid.UUID
    task_title: str
    is_required: bool


class RoleProcedureLinkCreate(BaseModel):
    role_id: uuid.UUID
    procedure_id: uuid.UUID
    is_required: bool = True


class RoleProcedureLinkOut(BaseModel):
    id: uuid.UUID
    role_id: uuid.UUID
    role_name: str
    procedure_id: uuid.UUID
    procedure_code: str
    procedure_title: str
    is_required: bool
