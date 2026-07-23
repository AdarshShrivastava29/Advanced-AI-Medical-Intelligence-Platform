"""OpenAI LLM adapter.

The ``openai`` SDK is imported lazily inside methods so that selecting a
different provider (or running Phase 1 without the package installed) never
triggers the import. Business logic only ever sees the :class:`AIProvider` port.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from app.core.exceptions import ConfigurationError
from app.domain.ports.llm_provider import AIProvider


class OpenAILLMProvider(AIProvider):
    """:class:`AIProvider` backed by the OpenAI Chat Completions API."""

    name = "openai"

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ConfigurationError("OpenAI provider requires a non-empty API key.")
        self._api_key = api_key
        self._model = model
        self._client: object | None = None

    def _get_client(self) -> object:
        """Lazily construct the async OpenAI client, importing the SDK on demand."""
        if self._client is None:
            try:
                from openai import AsyncOpenAI
            except ImportError as exc:  # pragma: no cover - exercised in AI phase
                raise ConfigurationError(
                    "The 'openai' package is not installed. Install it to use "
                    "LLM_PROVIDER=openai."
                ) from exc
            self._client = AsyncOpenAI(api_key=self._api_key)
        return self._client

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        """Generate a completion via the OpenAI Chat Completions API."""
        client = self._get_client()
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        response = await client.chat.completions.create(  # type: ignore[attr-defined]
            model=self._model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

    async def stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """Stream a completion incrementally from the OpenAI API."""
        client = self._get_client()
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        stream = await client.chat.completions.create(  # type: ignore[attr-defined]
            model=self._model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
