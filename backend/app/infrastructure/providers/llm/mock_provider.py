"""Deterministic mock LLM adapter.

Used for local development, tests and offline demos (``LLM_PROVIDER=mock``). It
requires no API key or network and produces a deterministic, clearly-labelled
response so pipelines are exercisable end-to-end without a real model.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from app.domain.ports.llm_provider import AIProvider


class MockLLMProvider(AIProvider):
    """An offline :class:`AIProvider` that echoes a deterministic completion."""

    name = "mock"

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        """Return a deterministic, clearly-marked mock completion."""
        preview = prompt.strip().replace("\n", " ")[:160]
        return f"[MOCK LLM RESPONSE] Received prompt: {preview}"

    async def stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """Yield the mock completion as whitespace-delimited chunks."""
        text = await self.generate(
            prompt, system=system, temperature=temperature, max_tokens=max_tokens
        )
        for token in text.split(" "):
            yield token + " "
