"""API v1 routers and aggregate router."""

from fastapi import APIRouter

from app.interface.api.v1.auth import router as auth_router
from app.interface.api.v1.predict import router as predict_router
from app.interface.api.v1.reports import router as reports_router
from app.interface.api.v1.users import router as users_router

# Aggregate router mounted under the configurable ``API_V1_PREFIX``.
api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(predict_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(users_router)

__all__ = ["api_v1_router"]
