"""Factory selecting the vector store adapter from ``VECTOR_DB``.

The embedding ``dimension`` is passed in because it must match the index; the
composition root supplies it from the active :class:`EmbeddingProvider`.
"""

from __future__ import annotations

from app.core.config import Settings
from app.core.exceptions import ConfigurationError
from app.domain.ports.vector_store import VectorStore
from app.infrastructure.providers.vector_db.chroma_store import ChromaVectorStore
from app.infrastructure.providers.vector_db.faiss_store import FaissVectorStore
from app.infrastructure.providers.vector_db.pinecone_store import PineconeVectorStore


def get_vector_store(settings: Settings, *, dimension: int) -> VectorStore:
    """Return the :class:`VectorStore` selected by ``settings.vector_db``.

    Args:
        settings: The application settings.
        dimension: Embedding dimensionality the index must match.

    Raises:
        ConfigurationError: If the selector value is unsupported.
    """
    provider = settings.vector_db
    if provider == "faiss":
        return FaissVectorStore(dimension=dimension, index_path=settings.vector_index_path)
    if provider == "chroma":
        return ChromaVectorStore(index_path=settings.vector_index_path)
    if provider == "pinecone":
        return PineconeVectorStore(api_key=settings.pinecone_api_key)
    raise ConfigurationError(f"Unsupported VECTOR_DB: {provider!r}")
