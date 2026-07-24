"""Prometheus metrics facade.

Defines the application, HTTP and AI metrics and thin increment helpers. Metrics
are a cross-cutting concern instrumented at the interface layer (middleware +
routers); the application/domain layers never import this module, preserving the
hexagonal dependency direction (see ``docs/25_Monitoring.md``).
"""

from __future__ import annotations

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

# --- HTTP ---
HTTP_REQUESTS = Counter(
    "aimip_http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)
HTTP_LATENCY = Histogram(
    "aimip_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
)

# --- AI / inference ---
PREDICTIONS = Counter(
    "aimip_predictions_total",
    "Total predictions served",
    ["predicted_class", "ood"],
)
INFERENCE_LATENCY = Histogram(
    "aimip_inference_duration_seconds",
    "Model inference latency in seconds",
)

# --- RAG ---
RAG_QUERIES = Counter(
    "aimip_rag_queries_total",
    "Total knowledge-assistant queries",
    ["grounded"],
)
DOCUMENTS_INGESTED = Counter(
    "aimip_documents_uploaded_total",
    "Total documents accepted for ingestion",
)


def record_http(method: str, path: str, status: int, duration_seconds: float) -> None:
    """Record one HTTP request's count and latency."""
    HTTP_REQUESTS.labels(method=method, path=path, status=str(status)).inc()
    HTTP_LATENCY.labels(method=method, path=path).observe(duration_seconds)


def record_prediction(predicted_class: str, *, ood: bool) -> None:
    """Increment the prediction counter."""
    PREDICTIONS.labels(predicted_class=predicted_class, ood=str(ood).lower()).inc()


def record_rag_query(*, grounded: bool) -> None:
    """Increment the RAG query counter."""
    RAG_QUERIES.labels(grounded=str(grounded).lower()).inc()


def record_document_upload() -> None:
    """Increment the document-upload counter."""
    DOCUMENTS_INGESTED.inc()


def render_metrics() -> tuple[bytes, str]:
    """Return the Prometheus exposition payload and its content type."""
    return generate_latest(), CONTENT_TYPE_LATEST
