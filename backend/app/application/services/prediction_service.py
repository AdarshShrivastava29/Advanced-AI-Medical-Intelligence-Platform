"""Prediction orchestration service — the Phase 2 vertical slice.

Coordinates the full pipeline behind ``POST /predict``: validate upload → run
inference + Grad-CAM (via the :class:`InferenceEngine` port) → persist the images
(via :class:`FileStorage`) → persist the prediction → generate and persist the
medical report (via :class:`ReportService`, which uses only the LLM abstraction).
Depends solely on ports, so it is provider- and framework-independent
(see ``docs/09_AI_Architecture.md``).
"""

from __future__ import annotations

import uuid

from app.application.dto.prediction_dto import PredictionResult
from app.application.services.image_validation import validate_image_upload
from app.application.services.report_service import ReportService
from app.core.config import Settings
from app.core.exceptions import AuthorizationError, NotFoundError
from app.core.logging import get_logger
from app.domain.entities.prediction import GradCamPaths, Prediction, PredictionStatus
from app.domain.entities.report import Report
from app.domain.entities.user import User
from app.domain.ports.file_storage import FileStorage
from app.domain.ports.inference import InferenceEngine
from app.domain.ports.repositories import PredictionRepository, ReportRepository
from app.domain.value_objects.role import Role
from app.infrastructure.storage.factory import GRADCAM_CATEGORY, UPLOAD_CATEGORY

logger = get_logger(__name__)

_EXTENSION_BY_MIME = {"image/png": "png", "image/jpeg": "jpg"}


class PredictionService:
    """Orchestrates upload → inference → explainability → report → persistence."""

    def __init__(
        self,
        inference_engine: InferenceEngine,
        file_storage: FileStorage,
        prediction_repository: PredictionRepository,
        report_repository: ReportRepository,
        report_service: ReportService,
        settings: Settings,
    ) -> None:
        self._engine = inference_engine
        self._storage = file_storage
        self._predictions = prediction_repository
        self._reports = report_repository
        self._report_service = report_service
        self._settings = settings

    async def create(
        self,
        *,
        user_id: str,
        filename: str,
        content_type: str,
        data: bytes,
        idempotency_key: str | None = None,
    ) -> PredictionResult:
        """Run the full prediction pipeline and persist the result.

        If ``idempotency_key`` was already used by this user, the previously
        stored prediction (and its report) is returned unchanged.
        """
        mime = validate_image_upload(data, content_type, self._settings)

        if idempotency_key:
            existing = await self._predictions.get_by_idempotency_key(user_id, idempotency_key)
            if existing is not None:
                report = await self._reports.get_by_prediction_id(existing.id or "")
                logger.info("predict.idempotent_hit", prediction_id=existing.id)
                return PredictionResult(prediction=existing, report=report)

        output = await self._engine.predict(data)

        token = uuid.uuid4().hex
        ext = _EXTENSION_BY_MIME.get(mime, "png")
        original_upload = await self._storage.save(UPLOAD_CATEGORY, f"{token}.{ext}", data)
        gradcam_original = await self._storage.save(
            GRADCAM_CATEGORY, f"{token}_original.png", output.gradcam.original_png
        )
        gradcam_heatmap = await self._storage.save(
            GRADCAM_CATEGORY, f"{token}_heatmap.png", output.gradcam.heatmap_png
        )
        gradcam_overlay = await self._storage.save(
            GRADCAM_CATEGORY, f"{token}_overlay.png", output.gradcam.overlay_png
        )

        prediction = Prediction(
            user_id=user_id,
            image_path=original_upload.path,
            image_url=original_upload.url,
            model_arch=output.model_arch,
            model_version=output.model_version,
            predicted_class=output.predicted_class,
            confidence=output.confidence,
            probabilities=output.probabilities,
            gradcam=GradCamPaths(
                original=gradcam_original.url,
                heatmap=gradcam_heatmap.url,
                overlay=gradcam_overlay.url,
            ),
            ood_flag=output.is_ood,
            status=PredictionStatus.COMPLETED,
            idempotency_key=idempotency_key,
        )
        prediction = await self._predictions.create(prediction)

        report = await self._report_service.generate(prediction)
        report = await self._reports.create(report)

        logger.info(
            "predict.completed",
            prediction_id=prediction.id,
            predicted_class=prediction.predicted_class,
            confidence=prediction.confidence,
            ood=prediction.ood_flag,
        )
        return PredictionResult(prediction=prediction, report=report)

    async def get_result(self, *, prediction_id: str, requester: User) -> PredictionResult:
        """Return a prediction and its report, enforcing ownership/role access."""
        prediction = await self._predictions.get(prediction_id)
        if prediction is None:
            raise NotFoundError("Prediction not found.")
        self._authorise(prediction.user_id, requester)
        report = await self._reports.get_by_prediction_id(prediction_id)
        return PredictionResult(prediction=prediction, report=report)

    async def regenerate_report(self, *, prediction_id: str, requester: User) -> Report:
        """Regenerate and persist a fresh report for an existing prediction."""
        prediction = await self._predictions.get(prediction_id)
        if prediction is None:
            raise NotFoundError("Prediction not found.")
        self._authorise(prediction.user_id, requester)
        report = await self._report_service.generate(prediction)
        return await self._reports.create(report)

    async def list_history(
        self, *, user_id: str, page: int = 1, size: int = 20
    ) -> tuple[list[Prediction], int]:
        """Return a page of the user's predictions and the total count."""
        page = max(page, 1)
        size = max(min(size, 100), 1)
        skip = (page - 1) * size
        items = await self._predictions.list_for_user(user_id, skip=skip, limit=size)
        total = await self._predictions.count_for_user(user_id)
        return items, total

    @staticmethod
    def _authorise(owner_id: str, requester: User) -> None:
        """Allow the owner, or any doctor/admin, to access a prediction."""
        if requester.id == owner_id or requester.role.satisfies(Role.DOCTOR):
            return
        raise AuthorizationError("You do not have access to this prediction.")
