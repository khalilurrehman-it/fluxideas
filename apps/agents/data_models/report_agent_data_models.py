from datetime import datetime
from pydantic import BaseModel
from data_models.validation_agent_data_models import ValidatedProblem


class ReportAgentOutput(BaseModel):
    """Output from Agent 4 — the completed research report."""

    research_topic: str
    search_job_id: str
    pdf_report_cloudinary_url: str | None | None
    top_validated_problems: list[ValidatedProblem]
    total_posts_analyzed_count: int
    report_generated_at_utc: datetime
