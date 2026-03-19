import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.procedure import UserProcedureCompliance
from app.models.user import User
from app.schemas.compliance import ComplianceOut
from app.services.compliance_service import derive_read_status, derive_training_status, sync_user_procedure_compliance

router = APIRouter(prefix="/compliance", tags=["compliance"])


def _to_out(row: UserProcedureCompliance) -> ComplianceOut:
    return ComplianceOut(
        id=row.id,
        user_id=row.user_id,
        user_name=row.user.name,
        procedure_id=row.procedure_id,
        procedure_title=row.procedure.title,
        procedure_version_id=row.procedure_version_id,
        read_procedure_version_id=row.read_procedure_version_id,
        read_status=derive_read_status(row),
        read_at=row.read_at,
        version_number=row.procedure_version.version_number if row.procedure_version else None,
        training_id=row.training_id,
        training_title=row.training.title if row.training else None,
        training_status=derive_training_status(row.training, row.assignment),
        assignment_id=row.assignment_id,
        role_assignment_id=row.role_assignment_id,
        role_name=row.role_assignment.role.name if row.role_assignment else None,
        status=row.status,
        due_date=row.due_date,
        completed_at=row.completed_at,
        last_score=row.last_score,
        evidence_json=row.evidence_json,
        updated_at=row.updated_at,
    )


@router.post("/sync", response_model=list[ComplianceOut], status_code=status.HTTP_201_CREATED)
async def sync_compliance(
    user_id: uuid.UUID | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = await sync_user_procedure_compliance(db, user_ids=[user_id] if user_id else None)
    await db.commit()
    for row in rows:
        await db.refresh(row)
    return [_to_out(row) for row in rows]


@router.get("", response_model=list[ComplianceOut])
async def list_compliance(
    user_id: uuid.UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    query = select(UserProcedureCompliance).order_by(UserProcedureCompliance.updated_at.desc())
    if user_id:
        query = query.where(UserProcedureCompliance.user_id == user_id)
    if status_filter:
        query = query.where(UserProcedureCompliance.status == status_filter)
    rows = list((await db.execute(query)).scalars().all())
    return [_to_out(row) for row in rows]


@router.post("/{compliance_id}/mark-read", response_model=ComplianceOut)
async def mark_compliance_as_read(
    compliance_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (
        await db.execute(select(UserProcedureCompliance).where(UserProcedureCompliance.id == compliance_id))
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compliance row not found")
    if row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot mark another user's procedure as read")
    if row.procedure_version_id is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Procedure does not have a current version")

    row.read_procedure_version_id = row.procedure_version_id
    row.read_at = datetime.now(timezone.utc)
    row.updated_at = row.read_at
    if row.evidence_json:
        row.evidence_json = {
            **row.evidence_json,
            "read_procedure_version_id": str(row.read_procedure_version_id),
            "read_status": "leido",
        }
    await db.commit()
    await db.refresh(row)
    return _to_out(row)
