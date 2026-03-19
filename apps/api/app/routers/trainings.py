import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.ai_usage_event import AIUsageEvent
from app.models.job import Job
from app.models.procedure import ProcedureVersion
from app.models.quiz import QuizQuestion
from app.models.training import Training, TrainingStructure
from app.models.user import User
from app.schemas.ai_usage import AIUsageEventOut, TrainingCostSummaryOut
from app.schemas.job import JobOut
from app.schemas.generated_content import validate_quiz_question
from app.schemas.quiz import QuizQuestionOut, QuizQuestionUpdate, QuizQuestionWrite
from app.schemas.training import (
    GenerateResponse,
    TrainingCreate,
    TrainingIterateRequest,
    TrainingOut,
)
from app.services.ai_pipeline import run_training_generation
from app.services.compliance_service import get_latest_procedure_version, sync_procedure_rollout

router = APIRouter(prefix="/trainings", tags=["trainings"])


def _sort_quiz_questions(questions: list[QuizQuestion]) -> list[QuizQuestion]:
    return sorted(
        questions,
        key=lambda q: (q.question_json.get("position", 10**9), str(q.id)),
    )


def _serialize_training(training: Training) -> TrainingOut:
    payload = TrainingOut.model_validate(training).model_dump()
    version = training.procedure_version
    payload["procedure_id"] = version.procedure_id if version else None
    payload["procedure_code"] = version.procedure.code if version else None
    payload["procedure_title"] = version.procedure.title if version else None
    payload["version_number"] = version.version_number if version else None
    payload["source_asset_type"] = version.source_asset_type if version else None
    payload["source_storage_key"] = version.source_storage_key if version else None
    payload["source_mime"] = version.source_mime if version else None
    payload["source_size"] = version.source_size if version else None
    return TrainingOut(**payload)


async def _get_training_or_404(training_id: uuid.UUID, db: AsyncSession) -> Training:
    result = await db.execute(select(Training).where(Training.id == training_id))
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")
    return training


async def _get_quiz_question_or_404(
    training_id: uuid.UUID, question_id: uuid.UUID, db: AsyncSession
) -> QuizQuestion:
    result = await db.execute(
        select(QuizQuestion).where(
            QuizQuestion.training_id == training_id,
            QuizQuestion.id == question_id,
        )
    )
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz question not found")
    return question


async def _reindex_quiz_positions(training_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.training_id == training_id))
    for index, question in enumerate(_sort_quiz_questions(result.scalars().all()), start=1):
        question.question_json = {**(question.question_json or {}), "position": index}


@router.post("", response_model=TrainingOut, status_code=status.HTTP_201_CREATED)
async def create_training(
    payload: TrainingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = (
        await db.execute(select(ProcedureVersion).where(ProcedureVersion.id == payload.procedure_version_id))
    ).scalar_one_or_none()
    if version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Procedure version not found")
    existing = (
        await db.execute(select(Training).where(Training.procedure_version_id == payload.procedure_version_id))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This procedure version already has a derived training",
        )

    training = Training(
        procedure_version_id=version.id,
        title=payload.title or f"{version.procedure.title} · v{version.version_number}",
        summary=payload.summary or version.change_summary,
        created_by=current_user.id,
    )
    db.add(training)
    await db.commit()
    latest_version = await get_latest_procedure_version(db, version.procedure_id)
    if latest_version is not None and latest_version.id == version.id:
        await sync_procedure_rollout(db, version.procedure_id)
        await db.commit()
    await db.refresh(training)
    return _serialize_training(training)


@router.get("", response_model=list[TrainingOut])
async def list_trainings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Training).order_by(Training.updated_at.desc()))
    return [_serialize_training(item) for item in result.scalars().all()]


@router.get("/{training_id}", response_model=TrainingOut)
async def get_training(training_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Training).where(Training.id == training_id))
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")
    return _serialize_training(training)


@router.delete("/{training_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_training(
    training_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Training).where(Training.id == training_id))
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")

    await db.delete(training)
    await db.commit()


@router.get("/{training_id}/quiz", response_model=list[QuizQuestionOut])
async def get_quiz_questions(training_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.training_id == training_id)
    )
    return _sort_quiz_questions(result.scalars().all())


@router.post("/{training_id}/quiz", response_model=QuizQuestionOut, status_code=status.HTTP_201_CREATED)
async def create_quiz_question(
    training_id: uuid.UUID,
    payload: QuizQuestionWrite,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_training_or_404(training_id, db)
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.training_id == training_id))
    current_questions = _sort_quiz_questions(result.scalars().all())
    question_json = validate_quiz_question(
        {
            **payload.question_json.model_dump(exclude_none=True),
            "verified": False,
            "position": len(current_questions) + 1,
        }
    )
    question = QuizQuestion(training_id=training_id, question_json=question_json)
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.patch("/{training_id}/quiz/{question_id}", response_model=QuizQuestionOut)
async def update_quiz_question(
    training_id: uuid.UUID,
    question_id: uuid.UUID,
    payload: QuizQuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_training_or_404(training_id, db)
    question = await _get_quiz_question_or_404(training_id, question_id, db)
    current_payload = question.question_json or {}
    question.question_json = validate_quiz_question(
        {
            **current_payload,
            **payload.question_json.model_dump(exclude_none=True),
            "verified": False,
            "position": current_payload.get("position"),
        }
    )
    await db.commit()
    await db.refresh(question)
    return question


@router.delete("/{training_id}/quiz/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quiz_question(
    training_id: uuid.UUID,
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_training_or_404(training_id, db)
    question = await _get_quiz_question_or_404(training_id, question_id, db)
    await db.delete(question)
    await db.flush()
    await _reindex_quiz_positions(training_id, db)
    await db.commit()


@router.post("/{training_id}/generate", response_model=GenerateResponse)
async def generate_training(
    training_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Training).where(Training.id == training_id))
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")
    if not training.procedure_version or not training.procedure_version.source_storage_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes subir un video fuente a la version del procedimiento antes de generar.",
        )
    if training.procedure_version.source_processing_status != "READY":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La versión del procedimiento todavía no terminó el source processing.",
        )

    job = Job(training_id=training_id, type="generate", status="UPLOADED", progress=0)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    asyncio.create_task(run_training_generation(training_id, job.id))

    return GenerateResponse(job_id=job.id, training_id=training.id)


@router.post("/{training_id}/iterate", response_model=GenerateResponse)
async def iterate_training(
    training_id: uuid.UUID,
    payload: TrainingIterateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Training).where(Training.id == training_id))
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")
    if not training.procedure_version or training.procedure_version.source_processing_status != "READY":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La iteración requiere artifacts de fuente listos en la versión del procedimiento.",
        )

    job = Job(training_id=training_id, type="iterate", status="UPLOADED", progress=0)
    db.add(job)
    await db.commit()
    await db.refresh(job)

    asyncio.create_task(run_training_generation(training_id, job.id, instruction=payload.instruction))

    return GenerateResponse(job_id=job.id, training_id=training.id)


@router.post("/{training_id}/publish", response_model=TrainingOut)
async def publish_training(
    training_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Training).where(Training.id == training_id))
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")

    training.status = "published"
    await db.commit()
    version = training.procedure_version
    if version is not None:
        latest_version = await get_latest_procedure_version(db, version.procedure_id)
        if latest_version is not None and latest_version.id == version.id:
            await sync_procedure_rollout(db, version.procedure_id)
            await db.commit()
    await db.refresh(training)
    return _serialize_training(training)


@router.get("/jobs/{job_id}", response_model=JobOut)
async def get_job(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.get("/{training_id}/cost-summary", response_model=TrainingCostSummaryOut)
async def get_training_cost_summary(
    training_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Training).where(Training.id == training_id))
    training = result.scalar_one_or_none()
    if not training:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Training not found")

    events_result = await db.execute(
        select(AIUsageEvent)
        .where(AIUsageEvent.training_id == training_id)
        .order_by(AIUsageEvent.created_at.asc())
    )
    events = events_result.scalars().all()

    totals_result = await db.execute(
        select(
            func.coalesce(func.sum(AIUsageEvent.request_count), 0),
            func.coalesce(func.sum(AIUsageEvent.input_tokens), 0),
            func.coalesce(func.sum(AIUsageEvent.output_tokens), 0),
            func.coalesce(func.sum(AIUsageEvent.estimated_cost_usd), 0.0),
        ).where(AIUsageEvent.training_id == training_id)
    )
    total_requests, total_input_tokens, total_output_tokens, total_estimated_cost_usd = totals_result.one()

    return TrainingCostSummaryOut(
        training_id=training_id,
        total_requests=int(total_requests or 0),
        total_input_tokens=int(total_input_tokens or 0),
        total_output_tokens=int(total_output_tokens or 0),
        total_estimated_cost_usd=float(total_estimated_cost_usd or 0.0),
        events=[AIUsageEventOut.model_validate(event) for event in events],
    )
