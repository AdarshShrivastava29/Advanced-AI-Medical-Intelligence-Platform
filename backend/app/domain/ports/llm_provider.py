"""LLM provider port (``AIProvider``).

Business logic calls :meth:`AIProvider.generate` / :meth:`AIProvider.stream`
and never imports a vendor SDK. The concrete adapter is selected at startup by
``LLM_PROVIDER`` through a factory (see ``docs/16_AI_Providers.md``). Adapters
that require optional SDKs lazy-import them so the abstraction loads without
those packages installed.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator


class AIProvider(ABC):
    """Port for large-language-model text generation."""

    name: str = "abstract"

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        """Generate a completion for ``prompt`` and return the text.

        Args:
            prompt: The user prompt.
            system: Optional system instruction.
            temperature: Sampling temperature.
            max_tokens: Optional cap on generated tokens.
        """

    @abstractmethod
    def stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """Return an async iterator yielding the completion incrementally.

        Implementations are async generators (``async def`` with ``yield``); the
        port is declared as a plain method returning an ``AsyncIterator`` so the
        override types line up.
        """

    async def health(self) -> bool:
        """Lightweight readiness check. Adapters may override; default True."""
        return True
