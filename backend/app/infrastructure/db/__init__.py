"""MongoDB database access: client lifecycle, index setup and repositories."""

from app.infrastructure.db.client import MongoDatabase
from app.infrastructure.db.prediction_repository import MongoPredictionRepository
from app.infrastructure.db.refresh_token_repository import MongoRefreshTokenRepository
from app.infrastructure.db.report_repository import MongoReportRepository
from app.infrastructure.db.user_repository import MongoUserRepository

__all__ = [
    "MongoDatabase",
    "MongoPredictionRepository",
    "MongoRefreshTokenRepository",
    "MongoReportRepository",
    "MongoUserRepository",
]
