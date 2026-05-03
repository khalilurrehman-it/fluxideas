import httpx
import os
from datetime import datetime, timezone
from typing import Literal

AgentPipelineStage = Literal[
    "scraping", "clustering", "validating", "generating", "done", "error"
]

AgentLogEventType = Literal["log", "complete", "error"]


async def stream_agent_progress_log_event_to_nodejs_backend(
    *,
    search_job_id: str,
    log_event_type: AgentLogEventType,
    pipeline_stage: AgentPipelineStage,
    human_readable_log_message: str,
    optional_payload_data: dict | None = None,
) -> None:
    """
    POSTs a single log event to the Node.js backend, which forwards it
    to the frontend via WebSocket so users see live progress.
    Failures are silently ignored — logs are best-effort, never crash the pipeline.
    """
    nodejs_log_callback_url = os.environ.get("NODEJS_BACKEND_LOG_ENDPOINT_URL", "")

    if not nodejs_log_callback_url:
        return

    log_event_payload = {
        "searchJobId": search_job_id,
        "type": log_event_type,
        "stage": pipeline_stage,
        "message": human_readable_log_message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": optional_payload_data,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            await http_client.post(
                nodejs_log_callback_url,
                json=log_event_payload,
                headers={
                    "X-Internal-Key": os.environ.get("INTERNAL_API_KEY", ""),
                    "Content-Type": "application/json",
                },
            )
    except Exception:
        pass
