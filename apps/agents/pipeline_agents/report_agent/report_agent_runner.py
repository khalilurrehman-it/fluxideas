from datetime import datetime

from data_models.validation_agent_data_models import ValidationAgentOutput
from data_models.report_agent_data_models import ReportAgentOutput
from pipeline_log_streaming.agent_progress_log_event_streamer import (
    stream_agent_progress_log_event_to_nodejs_backend,
)
from pipeline_agents.report_agent.pdf_report_generation_service import (
    generate_market_research_pdf_report_as_bytes,
)
from pipeline_agents.report_agent.cloudinary_pdf_upload_service import (
    upload_pdf_report_bytes_to_cloudinary,
)

# How many top validated problems to include in the final PDF report
TOP_N_PROBLEMS_TO_FEATURE_IN_REPORT = 5


async def run_report_agent_and_generate_pdf(
    validation_agent_output: ValidationAgentOutput,
) -> ReportAgentOutput:
    """
    Agent 4 — Report Generation.

    Takes the top validated problems from Agent 3 and produces a professional
    PDF market research report using ReportLab, then uploads it to Cloudinary.

    The PDF includes:
      - Cover page with topic, stats, and date
      - One section per top-5 validated problem (score, description, competitors, MVP)
      - Data methodology appendix

    Returns a ReportAgentOutput with the Cloudinary URL and the top problems list.
    """
    search_job_id = validation_agent_output.search_job_id
    research_topic = validation_agent_output.research_topic
    top_problems = validation_agent_output.validated_problems[:TOP_N_PROBLEMS_TO_FEATURE_IN_REPORT]

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="generating",
        human_readable_log_message=(
            f"📊  Generating PDF report — top {len(top_problems)} problems, "
            f"competitor analysis, MVP suggestions..."
        ),
    )

    pdf_bytes = generate_market_research_pdf_report_as_bytes(
        validation_agent_output=validation_agent_output,
        top_n_problems_to_include_in_report=TOP_N_PROBLEMS_TO_FEATURE_IN_REPORT,
    )

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="generating",
        human_readable_log_message="📊  Uploading report to cloud storage...",
    )

    try:
        pdf_cloudinary_url = await upload_pdf_report_bytes_to_cloudinary(
            pdf_bytes=pdf_bytes,
            research_topic=research_topic,
            search_job_id=search_job_id,
        )
    except Exception as upload_err:
        print(f"[report_agent] Cloudinary upload failed (dossier data still available): {upload_err}")
        pdf_cloudinary_url = None

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="complete",
        pipeline_stage="done",
        human_readable_log_message="✅  Report ready!",
        optional_payload_data={"pdfUrl": pdf_cloudinary_url},
    )

    return ReportAgentOutput(
        research_topic=research_topic,
        search_job_id=search_job_id,
        pdf_report_cloudinary_url=pdf_cloudinary_url,
        top_validated_problems=top_problems,
        total_posts_analyzed_count=validation_agent_output.total_problems_validated_count,
        report_generated_at_utc=datetime.utcnow(),
    )
