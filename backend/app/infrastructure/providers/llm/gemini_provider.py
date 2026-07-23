"""Google Gemini LLM adapter.

The ``google-generativeai`` SDK is imported lazily. Selecting this adapter
requires only ``LLM_PROVIDER=gemini`` plus ``GEMINI_API_KEY`` — no business-logic
change (see ``docs/16_AI_Providers.md``).
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from app.core.exceptions import ConfigurationError
from app.domain.ports.llm_provider import AIProvider


class GeminiLLMProvider(AIProvider):
    """:class:`AIProvider` backed by the Google Gemini API."""

    name = "gemini"

    def __init__(self, api_key: str, model: str) -> None:
        if not api_key:
            raise ConfigurationError("Gemini provider requires a non-empty API key.")
        self._api_key = api_key
        self._model_name = model
        self._model: object | None = None

    def _get_model(self) -> object:
        """Lazily configure the SDK and construct the generative model."""
        if self._model is None:
            try:
                import google.generativeai as genai
            except ImportError as exc:  # pragma: no cover - exercised in AI phase
                raise ConfigurationError(
                    "The 'google-generativeai' package is not installed. Install it "
                    "to use LLM_PROVIDER=gemini."
                ) from exc
            genai.configure(api_key=self._api_key)
            self._model = genai.GenerativeModel(self._model_name)
        return self._model

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> str:
        """Generate a completion via the Gemini API."""
        model = self._get_model()
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response = await model.generate_content_async(  # type: ignore[attr-defined]
            full_prompt,
            generation_config={"temperature": temperature, "max_output_tokens": max_tokens},
        )
        return response.text or ""

    async def stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float = 0.2,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """Stream a completion incrementally from the Gemini API."""
        model = self._get_model()
        full_prompt = f"{system}\n\n{prompt}" if system else prompt
        response = await model.generate_content_async(  # type: ignore[attr-defined]
            full_prompt,
            generation_config={"temperature": temperature, "max_output_tokens": max_tokens},
            stream=True,
        )
        async for chunk in response:
            if getattr(chunk, "text", None):
                yield chunk.text
