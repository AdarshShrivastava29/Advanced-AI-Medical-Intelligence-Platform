"""Chat routes: grounded knowledge-assistant Q&A and conversation history."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.application.services.chat_service import ChatService
from app.core.metrics import record_rag_query
from app.interface.dependencies import CurrentUser, get_chat_service
from app.interface.schemas.chat import (
    ChatMessageSchema,
    ChatRequest,
    ChatResponse,
    to_chat_message,
    to_chat_response,
)

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse, summary="Ask the knowledge assistant")
async def chat(
    payload: ChatRequest,
    current_user: CurrentUser,
    service: Annotated[ChatService, Depends(get_chat_service)],
) -> ChatResponse:
    """Answer a question grounded only in the uploaded knowledge base."""
    answer, assistant = await service.ask(
        user_id=current_user.id or "", message=payload.message, session_id=payload.session_id
    )
    record_rag_query(grounded=answer.grounded)
    return to_chat_response(answer, assistant.id or "")


@router.get(
    "/chat/history",
    response_model=list[ChatMessageSchema],
    summary="Get the conversation history",
)
async def chat_history(
    current_user: CurrentUser,
    service: Annotated[ChatService, Depends(get_chat_service)],
) -> list[ChatMessageSchema]:
    """Return the current user's chat history in chronological order."""
    messages = await service.history(current_user.id or "")
    return [to_chat_message(m) for m in messages]


@router.delete(
    "/chat/history",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Clear the conversation history",
)
async def clear_history(
    current_user: CurrentUser,
    service: Annotated[ChatService, Depends(get_chat_service)],
) -> Response:
    """Delete the current user's chat history."""
    await service.clear(current_user.id or "")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
