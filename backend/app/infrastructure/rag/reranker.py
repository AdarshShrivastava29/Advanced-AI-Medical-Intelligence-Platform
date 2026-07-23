"""Maximal Marginal Relevance (MMR) reranking for diversity.

Reorders fused candidates to balance relevance with novelty, reducing redundant
near-duplicate chunks in the final context. Similarity uses Jaccard overlap of
token sets — deterministic and model-free (see ``docs/13_RAG_Architecture.md``).
"""

from __future__ import annotations

import re

from app.domain.value_objects.rag import RetrievedChunk

_TOKEN = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> set[str]:
    return set(_TOKEN.findall(text.lower()))


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def mmr_rerank(
    candidates: list[RetrievedChunk], *, k: int, lambda_: float = 0.7
) -> list[RetrievedChunk]:
    """Return up to ``k`` chunks reranked by MMR.

    Args:
        candidates: Fused candidates ordered by relevance (highest first).
        k: Number of chunks to keep.
        lambda_: Trade-off — higher favours relevance, lower favours diversity.
    """
    if not candidates:
        return []
    remaining = list(candidates)
    token_sets = {c.chunk_id: _tokens(c.text) for c in remaining}
    selected: list[RetrievedChunk] = [remaining.pop(0)]

    while remaining and len(selected) < k:
        best_index = 0
        best_score = float("-inf")
        for i, candidate in enumerate(remaining):
            redundancy = max(
                _jaccard(token_sets[candidate.chunk_id], token_sets[s.chunk_id]) for s in selected
            )
            mmr = lambda_ * candidate.score - (1 - lambda_) * redundancy
            if mmr > best_score:
                best_score = mmr
                best_index = i
        selected.append(remaining.pop(best_index))
    return selected
