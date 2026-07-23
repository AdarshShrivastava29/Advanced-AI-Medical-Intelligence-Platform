"""Unit tests for VectorStore + EmbeddingProvider ENV switching and FAISS roundtrip."""

from __future__ import annotations

import pytest

from app.core.config import Settings
from app.infrastructure.providers.embeddings.factory import get_embedding_provider
from app.infrastructure.providers.vector_db.chroma_store import ChromaVectorStore
from app.infrastructure.providers.vector_db.factory import get_vector_store
from app.infrastructure.providers.vector_db.faiss_store import FaissVectorStore
from app.infrastructure.providers.vector_db.pinecone_store import PineconeVectorStore

pytestmark = pytest.mark.asyncio


def _settings(**overrides: object) -> Settings:
    base: dict[str, object] = {
        "_env_file": None,
        "llm_provider": "mock",
        "embedding_provider": "sentence_transformer",
        "jwt_secret": "x" * 40,
    }
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


def test_vector_db_switching_selects_adapter() -> None:
    faiss = get_vector_store(_settings(vector_db="faiss"), dimension=8)
    chroma = get_vector_store(_settings(vector_db="chroma"), dimension=8)
    pinecone = get_vector_store(
        _settings(vector_db="pinecone", pinecone_api_key="pc-test"), dimension=8
    )
    assert isinstance(faiss, FaissVectorStore) and faiss.name == "faiss"
    assert isinstance(chroma, ChromaVectorStore) and chroma.name == "chroma"
    assert isinstance(pinecone, PineconeVectorStore) and pinecone.name == "pinecone"


def test_embedding_switching_selects_adapter() -> None:
    st = get_embedding_provider(_settings(embedding_provider="sentence_transformer"))
    openai = get_embedding_provider(
        _settings(embedding_provider="openai", openai_api_key="sk-test")
    )
    gemini = get_embedding_provider(
        _settings(embedding_provider="gemini", gemini_api_key="g-test")
    )
    assert st.name == "sentence_transformer" and st.dimension == 384
    assert openai.name == "openai" and openai.dimension == 1536
    assert gemini.name == "gemini"


async def test_faiss_add_search_roundtrip(tmp_path) -> None:  # type: ignore[no-untyped-def]
    store = FaissVectorStore(dimension=3, index_path=str(tmp_path / "idx"))
    await store.add(
        ["a", "b"],
        [[1.0, 0.0, 0.0], [0.0, 1.0, 0.0]],
        [{"document_id": "d1"}, {"document_id": "d1"}],
    )
    hits = await store.search([0.9, 0.1, 0.0], k=2)
    assert hits[0].id == "a"
    assert 0.0 <= hits[0].score <= 1.0


async def test_faiss_persist_and_load(tmp_path) -> None:  # type: ignore[no-untyped-def]
    path = str(tmp_path / "idx")
    store = FaissVectorStore(dimension=3, index_path=path)
    await store.add(["a"], [[1.0, 0.0, 0.0]], [{"document_id": "d1"}])
    await store.persist()

    reloaded = FaissVectorStore(dimension=3, index_path=path)
    await reloaded.load()
    hits = await reloaded.search([1.0, 0.0, 0.0], k=1)
    assert hits and hits[0].id == "a"
