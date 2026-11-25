"""Optional OpenTelemetry tracing (enabled when exporters are configured)."""
from __future__ import annotations

import os

from app.observability.events import logger


def setup_tracing(service_name: str = "aise-backend") -> None:
    if os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
        try:
            from opentelemetry import trace
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
            provider = TracerProvider()
            provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
            trace.set_tracer_provider(provider)
            logger.info("OpenTelemetry tracing enabled")
        except ImportError:
            logger.warning("OTEL endpoint set but exporter package is not installed")
    else:
        logger.info("OpenTelemetry tracing disabled (no OTEL_EXPORTER_OTLP_ENDPOINT)")
