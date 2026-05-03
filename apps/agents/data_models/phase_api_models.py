from pydantic import BaseModel
from typing import Any


class Phase1PipelineRequest(BaseModel):
    """Request body for POST /run-pipeline/phase1."""

    research_topic: str
    search_job_id: str
    nodejs_log_callback_url: str
    founder_profile: dict | None = None


class Phase1PipelineResponse(BaseModel):
    """Response after Phase 1 completes — returns the session token and problem list."""

    session_token: str
    identified_problems: list[dict]


class Phase2PipelineRequest(BaseModel):
    """Request body for POST /run-pipeline/phase2."""

    session_token: str
    search_job_id: str
    selected_problem: dict
    nodejs_log_callback_url: str


class Phase2PipelineResponse(BaseModel):
    """Response after Phase 2 completes — returns all deep-dive artefacts."""

    pdf_url: str | None
    pptx_url: str | None
    mockup_url: str | None
    blueprint: dict | None
    market_size_analysis: dict | None
    risk_assessment: dict | None
