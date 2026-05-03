from pydantic import BaseModel, Field


class RunAgentPipelineRequest(BaseModel):
    """Request body sent from Node.js backend to POST /run-pipeline."""

    research_topic: str = Field(min_length=3, max_length=500)
    search_job_id: str = Field(description="UUID of the search job in the Node.js database")
    nodejs_websocket_log_callback_url: str = Field(
        description="URL the agent pipeline will POST log events to"
    )


class RunAgentPipelineResponse(BaseModel):
    """Response returned to Node.js after the full pipeline completes."""

    search_job_id: str
    pdf_report_cloudinary_url: str
    top_validated_problems: list[dict]
    total_posts_analyzed_count: int
    pipeline_completed_successfully: bool
    pipeline_error_message: str | None = None
