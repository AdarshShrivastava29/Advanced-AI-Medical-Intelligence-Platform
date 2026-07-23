"""RAG infrastructure: ingestion, retrieval, reranking and grounded generation.

Composes the ENV-selected ``EmbeddingProvider``, ``VectorStore`` and
``AIProvider`` behind the :class:`RagEngine` port so the application stays
provider-agnostic (see ``docs/13_RAG_Architecture.md``).
"""
