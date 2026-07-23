"""Hybrid retrieval fusion: dense (vector) ranking + sparse (BM25) fused with RRF.

The engine supplies the dense ranking (from the ENV-selected ``VectorStore``);
this module adds BM25 lexical recall over the chunk corpus and merges both with
Reciprocal Rank Fusion so neither modality alone caps recall
(see ``docs/13_RAG_Architecture.md``).
"""

from __future__ import annotations

import re

from app.domain.entities.document_chunk import DocumentChunk
from app.domain.value_objects.rag import RetrievedChunk

_TOKEN = re.compile(r"[a-z0-9]+")
_RRF_K = 60


def _tokenize(text: str) -> list[str]:
    """Lowercase word tokenisation for BM25."""
    return _TOKEN.findall(text.lower())


def bm25_rank(query: str, corpus: list[DocumentChunk], *, k: int) -> list[str]:
    """Return vector ids ranked by BM25 keyword relevance (highest first)."""
    try:
        from rank_bm25 import BM25Okapi
    except ImportError:  # pragma: no cover - RAG dependency
        return []
    tokenised = [_tokenize(chunk.text) for chunk in corpus]
    bm25 = BM25Okapi(tokenised)
    scores = bm25.get_scores(_tokenize(query))
    ranked = sorted(range(len(corpus)), key=lambda i: scores[i], reverse=True)
    return [corpus[i].vector_id for i in ranked[:k] if scores[i] > 0]


def reciprocal_rank_fusion(rankings: list[list[str]]) -> list[tuple[str, float]]:
    """Fuse multiple ranked id lists via Reciprocal Rank Fusion."""
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, doc_id in enumerate(ranking):
            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (_RRF_K + rank + 1)
    return sorted(scores.items(), key=lambda kv: kv[1], reverse=True)


def hybrid_retrieve(
    query: str,
    corpus: list[DocumentChunk],
    dense_ids: list[str],
    *,
    k: int,
) -> list[RetrievedChunk]:
    """Fuse a dense ranking with BM25 and return the top-``k`` chunks."""
    if not corpus:
        return []
    by_id = {chunk.vector_id: chunk for chunk in corpus}
    sparse_ids = bm25_rank(query, corpus, k=k * 3)
    fused = reciprocal_rank_fusion([dense_ids, sparse_ids])

    results: list[RetrievedChunk] = []
    for chunk_id, score in fused:
        chunk = by_id.get(chunk_id)
        if chunk is None:
            continue
        results.append(
            RetrievedChunk(
                chunk_id=chunk.vector_id,
                document_id=chunk.document_id,
                filename=chunk.filename,
                text=chunk.text,
                page=chunk.page,
                score=round(score, 6),
            )
        )
        if len(results) >= k:
            break
    return results
