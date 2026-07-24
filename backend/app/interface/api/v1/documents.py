"""Document routes: upload (async ingest), list and delete knowledge-base PDFs."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Response, UploadFile, status

from app.application.services.document_service import DocumentService
from app.core.metrics import record_document_upload
from app.domain.value_objects.role import Role
from app.interface.dependencies import CurrentUser, get_document_service, require_role
from app.interface.schemas.common import Page
from app.interface.schemas.document import (
    DocumentResponse,
    UploadAcceptedResponse,
    to_document_response,
)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "",
    response_model=UploadAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a PDF for asynchronous ingestion",
)
async def upload_document(
    current_user: CurrentUser,
    service: Annotated[DocumentService, Depends(get_document_service)],
    file: Annotated[UploadFile, File(description="A medical PDF document.")],
) -> UploadAcceptedResponse:
    """Validate + store a PDF and queue it for background ingestion."""
    data = await file.read()
    document = await service.upload(
        user_id=current_user.id or "",
        filename=file.filename or "document.pdf",
        content_type=file.content_type or "",
        data=data,
    )
    record_document_upload()
    return UploadAcceptedResponse(document=to_document_response(document))


@router.get("", response_model=Page[DocumentResponse], summary="List knowledge-base documents")
async def list_documents(
    current_user: CurrentUser,
    service: Annotated[DocumentService, Depends(get_document_service)],
    page: int = 1,
    size: int = 20,
) -> Page[DocumentResponse]:
    """Return a paginated list of documents with their ingestion status."""
    docs, total = await service.list_documents(page=page, size=size)
    pages = (total + size - 1) // size if size else 0
    return Page[DocumentResponse](
        items=[to_document_response(d) for d in docs],
        page=page,
        size=size,
        total=total,
        pages=pages,
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document (admin/doctor)",
    dependencies=[Depends(require_role(Role.DOCTOR))],
)
async def delete_document(
    document_id: str,
    service: Annotated[DocumentService, Depends(get_document_service)],
) -> Response:
    """Delete a document and remove its chunks from the index."""
    await service.delete(document_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
