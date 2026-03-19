import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment
from app.models.procedure import ProcedureVersion, TaskProcedureLink, UserProcedureCompliance
from app.models.role import RoleTaskLink, UserRoleAssignment
from app.models.training import Training


def derive_training_status(training: Training | None, latest_assignment: Assignment | None) -> str:
    if training is None:
        return "sin_training"
    if latest_assignment and latest_assignment.status == "completed":
        return "completo"
    return "incompleto"


def derive_read_status(row: UserProcedureCompliance) -> str:
    if (
        row.procedure_version_id is not None
        and row.read_procedure_version_id == row.procedure_version_id
        and row.read_at is not None
    ):
        return "leido"
    return "sin_leer"


def derive_compliance_status(training: Training | None, latest_assignment: Assignment | None) -> str:
    if latest_assignment and latest_assignment.status == "completed":
        return "compliant"
    if latest_assignment and latest_assignment.status == "in_progress":
        return "in_training"
    if training is None:
        return "missing_training"
    return "pending"


async def sync_user_procedure_compliance(
    db: AsyncSession,
    *,
    user_ids: list[uuid.UUID] | None = None,
) -> list[UserProcedureCompliance]:
    role_assignment_query = select(UserRoleAssignment).where(UserRoleAssignment.status == "active")
    if user_ids is not None:
        role_assignment_query = role_assignment_query.where(UserRoleAssignment.user_id.in_(user_ids))
    role_assignments = list((await db.execute(role_assignment_query)).scalars().all())

    requirement_map: dict[tuple[uuid.UUID, uuid.UUID], tuple[UserRoleAssignment, uuid.UUID]] = {}
    for role_assignment in role_assignments:
        task_links = list(
            (
                await db.execute(
                    select(RoleTaskLink).where(RoleTaskLink.role_id == role_assignment.role_id, RoleTaskLink.is_required.is_(True))
                )
            )
            .scalars()
            .all()
        )
        for task_link in task_links:
            procedure_links = list(
                (
                    await db.execute(
                        select(TaskProcedureLink).where(TaskProcedureLink.task_id == task_link.task_id)
                    )
                )
                .scalars()
                .all()
            )
            for procedure_link in procedure_links:
                requirement_map[(role_assignment.user_id, procedure_link.procedure_id)] = (role_assignment, task_link.task_id)

    compliances: list[UserProcedureCompliance] = []
    for (user_id, procedure_id), (role_assignment, _task_id) in requirement_map.items():
        latest_version = (
            (
                await db.execute(
                    select(ProcedureVersion)
                    .where(ProcedureVersion.procedure_id == procedure_id)
                    .order_by(ProcedureVersion.version_number.desc())
                )
            )
            .scalars()
            .first()
        )
        if latest_version is None:
            continue

        training = (
            (
                await db.execute(
                    select(Training).where(Training.procedure_version_id == latest_version.id)
                )
            )
            .scalars()
            .first()
        )

        latest_assignment = None
        if training is not None:
            latest_assignment = (
                (
                    await db.execute(
                        select(Assignment)
                        .where(
                            Assignment.training_id == training.id,
                            Assignment.user_id == user_id,
                        )
                        .order_by(Assignment.completed_at.desc().nullslast(), Assignment.due_date.desc().nullslast())
                    )
                )
                .scalars()
                .first()
            )

        compliance = (
            (
                await db.execute(
                    select(UserProcedureCompliance).where(
                        UserProcedureCompliance.user_id == user_id,
                        UserProcedureCompliance.procedure_id == procedure_id,
                    )
                )
            )
            .scalars()
            .first()
        )
        if compliance is None:
            compliance = UserProcedureCompliance(user_id=user_id, procedure_id=procedure_id)
            db.add(compliance)

        compliance.procedure_version_id = latest_version.id
        compliance.role_assignment_id = role_assignment.id
        compliance.training_id = training.id if training else None
        compliance.assignment_id = latest_assignment.id if latest_assignment else None
        compliance.due_date = latest_assignment.due_date if latest_assignment else None
        compliance.completed_at = latest_assignment.completed_at if latest_assignment else None
        compliance.last_score = latest_assignment.score if latest_assignment else None

        compliance.status = derive_compliance_status(training, latest_assignment)

        compliance.evidence_json = {
            "procedure_version_id": str(latest_version.id),
            "read_procedure_version_id": (
                str(compliance.read_procedure_version_id) if compliance.read_procedure_version_id else None
            ),
            "read_status": derive_read_status(compliance),
            "training_id": str(training.id) if training else None,
            "training_status": derive_training_status(training, latest_assignment),
            "assignment_status": latest_assignment.status if latest_assignment else None,
        }
        compliance.updated_at = datetime.now(timezone.utc)
        compliances.append(compliance)

    # Remove stale compliance rows for the targeted users that no longer map to an active role/task/procedure requirement.
    if user_ids is not None:
        existing_query = select(UserProcedureCompliance).where(UserProcedureCompliance.user_id.in_(user_ids))
    else:
        existing_query = select(UserProcedureCompliance)
    existing = list((await db.execute(existing_query)).scalars().all())
    valid_keys = set(requirement_map.keys())
    for row in existing:
        if (row.user_id, row.procedure_id) not in valid_keys:
            await db.delete(row)

    await db.flush()
    return compliances


async def get_latest_procedure_version(db: AsyncSession, procedure_id: uuid.UUID) -> ProcedureVersion | None:
    return (
        (
            await db.execute(
                select(ProcedureVersion)
                .where(ProcedureVersion.procedure_id == procedure_id)
                .order_by(ProcedureVersion.version_number.desc())
            )
        )
        .scalars()
        .first()
    )


async def get_impacted_user_ids_for_procedure(db: AsyncSession, procedure_id: uuid.UUID) -> list[uuid.UUID]:
    result = await db.execute(
        select(UserRoleAssignment.user_id)
        .join(RoleTaskLink, RoleTaskLink.role_id == UserRoleAssignment.role_id)
        .join(TaskProcedureLink, TaskProcedureLink.task_id == RoleTaskLink.task_id)
        .where(
            UserRoleAssignment.status == "active",
            RoleTaskLink.is_required.is_(True),
            TaskProcedureLink.procedure_id == procedure_id,
        )
    )
    return list(dict.fromkeys(result.scalars().all()))


async def get_active_user_ids_for_role(db: AsyncSession, role_id: uuid.UUID) -> list[uuid.UUID]:
    result = await db.execute(
        select(UserRoleAssignment.user_id).where(
            UserRoleAssignment.role_id == role_id,
            UserRoleAssignment.status == "active",
        )
    )
    return list(dict.fromkeys(result.scalars().all()))


async def sync_procedure_rollout(db: AsyncSession, procedure_id: uuid.UUID) -> list[UserProcedureCompliance]:
    user_ids = await get_impacted_user_ids_for_procedure(db, procedure_id)
    if not user_ids:
        return []

    latest_version = await get_latest_procedure_version(db, procedure_id)
    if latest_version is None:
        return []

    training = (
        await db.execute(select(Training).where(Training.procedure_version_id == latest_version.id))
    ).scalar_one_or_none()

    if training is not None:
        existing_assignment_user_ids = set(
            (
                await db.execute(
                    select(Assignment.user_id).where(
                        Assignment.training_id == training.id,
                        Assignment.user_id.in_(user_ids),
                    )
                )
            )
            .scalars()
            .all()
        )
        for user_id in user_ids:
            if user_id in existing_assignment_user_ids:
                continue
            db.add(
                Assignment(
                    training_id=training.id,
                    user_id=user_id,
                    assignment_type="training",
                    status="assigned",
                )
            )
        await db.flush()

    return await sync_user_procedure_compliance(db, user_ids=user_ids)
