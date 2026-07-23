"""Text cleaning and prompt-safety sanitisation for RAG.

``clean_text`` normalises extracted PDF text (whitespace, hyphenation, control
chars). ``sanitise_for_prompt`` neutralises prompt-injection attempts that may be
embedded in retrieved documents, so untrusted context can never override the
system instruction (see ``docs/23_Security.md``).
"""

from __future__ import annotations

import re

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_MULTISPACE = re.compile(r"[ \t]+")
_MULTINEWLINE = re.compile(r"\n{3,}")
_HYPHEN_BREAK = re.compile(r"(\w)-\n(\w)")

# Phrases commonly used to hijack an LLM via injected document content.
_INJECTION_PATTERNS = re.compile(
    r"(?im)^\s*(ignore (all|any|previous).*|disregard .*|system\s*:|you are now|"
    r"new instructions?\s*:).*$"
)


def clean_text(raw: str) -> str:
    """Normalise raw extracted text into clean, readable prose."""
    text = _CONTROL_CHARS.sub("", raw)
    text = _HYPHEN_BREAK.sub(r"\1\2", text)  # de-hyphenate line-wrapped words
    text = _MULTISPACE.sub(" ", text)
    text = _MULTINEWLINE.sub("\n\n", text)
    return text.strip()


def sanitise_for_prompt(text: str, *, max_chars: int = 2000) -> str:
    """Strip injection-style directives and cap length before prompting.

    Retrieved context is reference data, never instructions; lines that look like
    prompt-injection commands are removed defensively.
    """
    stripped = _INJECTION_PATTERNS.sub("[redacted]", text)
    stripped = stripped.replace("```", "'''")  # avoid breaking the prompt fence
    return stripped[:max_chars].strip()
