"""Upload validation: MIME allow-list, size limit and magic-byte sniffing.

Content-type headers are attacker-controlled, so the declared type is checked
*and* the leading bytes are sniffed to confirm the real format
(see ``docs/23_Security.md``).
"""

from __future__ import annotations

from app.core.config import Settings
from app.core.exceptions import ValidationError

# Magic-byte signatures for the allowed formats.
_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
_JPEG_SIGNATURE = b"\xff\xd8\xff"

_MIME_BY_SIGNATURE: list[tuple[bytes, str]] = [
    (_PNG_SIGNATURE, "image/png"),
    (_JPEG_SIGNATURE, "image/jpeg"),
]


def _sniff_mime(data: bytes) -> str | None:
    """Return the real MIME type inferred from the leading bytes, or None."""
    return next(
        (mime for signature, mime in _MIME_BY_SIGNATURE if data.startswith(signature)),
        None,
    )


def validate_image_upload(data: bytes, declared_content_type: str, settings: Settings) -> str:
    """Validate an uploaded image and return its confirmed MIME type.

    Args:
        data: Raw uploaded bytes.
        declared_content_type: The client-declared ``Content-Type``.
        settings: Application settings (size limit, allowed types).

    Raises:
        ValidationError: If the file is empty, too large, of a disallowed type, or
            its real format does not match the declared/allowed types.
    """
    if not data:
        raise ValidationError("Uploaded file is empty.")
    if len(data) > settings.max_upload_size:
        raise ValidationError(
            f"File exceeds the maximum size of {settings.max_upload_size} bytes."
        )

    allowed = settings.allowed_image_type_set
    declared = (declared_content_type or "").split(";")[0].strip().lower()
    if declared not in allowed:
        raise ValidationError(
            f"Unsupported content type {declared!r}. Allowed: {sorted(allowed)}."
        )

    sniffed = _sniff_mime(data)
    if sniffed is None or sniffed not in allowed:
        raise ValidationError("File content does not match an allowed image format.")
    if sniffed != declared:
        raise ValidationError("Declared content type does not match file content.")
    return sniffed
