import os
from fastapi import APIRouter, HTTPException, Request

from data_models.pipeline_request_response_models import (
    RunAgentPipelineRequest,
    RunAgentPipelineResponse,
)
from data_models.phase_api_models import (
    Phase1PipelineRequest,
    Phase1PipelineResponse,
    Phase2PipelineRequest,
    Phase2PipelineResponse,
)
from pipeline_agents.scraper_agent.scraper_agent_runner import (
    run_scraper_agent_and_collect_all_raw_posts,
)
from pipeline_agents.clustering_agent.clustering_agent_runner import (
    run_clustering_agent_and_identify_problem_patterns,
)
from pipeline_agents.validation_agent.validation_agent_runner import (
    run_validation_agent_and_score_all_problem_clusters,
)
from pipeline_agents.report_agent.report_agent_runner import (
    run_report_agent_and_generate_pdf,
)
from orchestrator.pipeline_graph import compiled_pipeline_graph

pipeline_execution_api_router = APIRouter()


def _verify_internal_api_key_header(request: Request) -> None:
    """
    Validates the X-Internal-Key header to ensure only the Node.js backend
    can trigger the pipeline. Raises 403 if the key is missing or wrong.
    """
    expected_internal_api_key = os.environ.get("INTERNAL_API_KEY", "")
    provided_api_key = request.headers.get("X-Internal-Key", "")

    if not expected_internal_api_key or provided_api_key != expected_internal_api_key:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: invalid or missing X-Internal-Key header.",
        )


@pipeline_execution_api_router.post("/run-pipeline", response_model=RunAgentPipelineResponse)
async def handle_run_agent_pipeline_request(
    pipeline_request: RunAgentPipelineRequest,
    request: Request,
) -> RunAgentPipelineResponse:
    """
    POST /run-pipeline — Full 4-agent research pipeline.

    Accepts a research topic from the Node.js backend, runs all four agents
    sequentially (Scraper → Clustering → Validation → Report), and returns
    the Cloudinary PDF URL and the top validated problems.

    Protected by X-Internal-Key header — not publicly accessible.
    """
    _verify_internal_api_key_header(request)

    research_topic = pipeline_request.research_topic
    search_job_id = pipeline_request.search_job_id

    # Set the Node.js log callback URL in the environment so the streamer can find it
    # (thread-safe enough for this single-pipeline-at-a-time architecture)
    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = (
        pipeline_request.nodejs_websocket_log_callback_url
    )

    try:
        # ------------------------------------------------------------------
        # Agent 1 — Scraper: collect raw posts from all four data sources
        # ------------------------------------------------------------------
        scraper_agent_output = await run_scraper_agent_and_collect_all_raw_posts(
            research_topic=research_topic,
            search_job_id=search_job_id,
        )

        # ------------------------------------------------------------------
        # Agent 2 — Clustering: identify distinct problem patterns
        # ------------------------------------------------------------------
        clustering_agent_output = await run_clustering_agent_and_identify_problem_patterns(
            scraper_agent_output=scraper_agent_output,
        )

        # ------------------------------------------------------------------
        # Agent 3 — Validation: score each cluster for market opportunity
        # ------------------------------------------------------------------
        validation_agent_output = await run_validation_agent_and_score_all_problem_clusters(
            clustering_agent_output=clustering_agent_output,
        )

        # ------------------------------------------------------------------
        # Agent 4 — Report: generate PDF and upload to Cloudinary
        # ------------------------------------------------------------------
        report_agent_output = await run_report_agent_and_generate_pdf(
            validation_agent_output=validation_agent_output,
        )

        top_problems_as_dicts = [
            validated_problem.model_dump(mode="json")
            for validated_problem in report_agent_output.top_validated_problems
        ]

        return RunAgentPipelineResponse(
            search_job_id=search_job_id,
            pdf_report_cloudinary_url=report_agent_output.pdf_report_cloudinary_url,
            top_validated_problems=top_problems_as_dicts,
            total_posts_analyzed_count=scraper_agent_output.total_posts_collected_count,
            pipeline_completed_successfully=True,
            pipeline_error_message=None,
        )

    except Exception as pipeline_execution_error:
        error_message = str(pipeline_execution_error)
        print(f"[pipeline_handler] Pipeline failed for job {search_job_id}: {error_message}")

        return RunAgentPipelineResponse(
            search_job_id=search_job_id,
            pdf_report_cloudinary_url="",
            top_validated_problems=[],
            total_posts_analyzed_count=0,
            pipeline_completed_successfully=False,
            pipeline_error_message=error_message,
        )


@pipeline_execution_api_router.post(
    "/run-pipeline/phase1",
    response_model=Phase1PipelineResponse,
)
async def handle_run_pipeline_phase1(
    phase1_request: Phase1PipelineRequest,
    request: Request,
) -> Phase1PipelineResponse:
    """
    POST /run-pipeline/phase1 — LangGraph Phase 1.

    Runs Scout → Researcher → Reasoner → Analyst and then pauses before the
    ask_human interrupt. Returns the session token (thread_id) and the ranked
    list of identified problems for the Node.js backend to surface to the user.

    Protected by X-Internal-Key header — not publicly accessible.
    """
    _verify_internal_api_key_header(request)

    research_topic = phase1_request.research_topic
    search_job_id = phase1_request.search_job_id

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = phase1_request.nodejs_log_callback_url

    config = {"configurable": {"thread_id": search_job_id}}

    initial_state: dict = {
        "topic": research_topic,
        "search_job_id": search_job_id,
        "nodejs_log_callback_url": phase1_request.nodejs_log_callback_url,
        "founder_profile": phase1_request.founder_profile,
        "raw_data": [],
        "raw_sources": [],
        "research_notes": [],
        "research_rounds": 0,
        "need_more_research": False,
        "reasoning_log": "",
        "identified_problems": [],
        "selected_problem": None,
        "blueprint": None,
        "market_size_analysis": None,
        "mockup_url": None,
        "risk_assessment": None,
        "pdf_url": None,
        "pptx_url": None,
        "reporter_attempted": False,
        "next_agent": "",
    }

    try:
        async for _ in compiled_pipeline_graph.astream(initial_state, config):
            pass
    except Exception as phase1_error:
        print(f"[pipeline_handler] Phase 1 error for job {search_job_id}: {phase1_error}")

    graph_state = compiled_pipeline_graph.get_state(config)
    identified_problems = graph_state.values.get("identified_problems", [])

    return Phase1PipelineResponse(
        session_token=search_job_id,
        identified_problems=identified_problems,
    )


@pipeline_execution_api_router.post(
    "/run-pipeline/phase2",
    response_model=Phase2PipelineResponse,
)
async def handle_run_pipeline_phase2(
    phase2_request: Phase2PipelineRequest,
    request: Request,
) -> Phase2PipelineResponse:
    """
    POST /run-pipeline/phase2 — LangGraph Phase 2.

    Resumes the paused graph from Phase 1, injects the user-selected problem,
    and runs Strategist → Economist → Designer → Critic → Reporter.
    Returns the final artefacts (PDF URL, PPTX URL, blueprint, market analysis).

    Protected by X-Internal-Key header — not publicly accessible.
    """
    _verify_internal_api_key_header(request)

    session_token = phase2_request.session_token
    search_job_id = phase2_request.search_job_id

    config = {"configurable": {"thread_id": session_token}}

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = phase2_request.nodejs_log_callback_url

    # Inject the human-selected problem and resume
    compiled_pipeline_graph.update_state(
        config,
        {
            "selected_problem": phase2_request.selected_problem,
            "search_job_id": search_job_id,
            "nodejs_log_callback_url": phase2_request.nodejs_log_callback_url,
        },
    )

    try:
        async for _ in compiled_pipeline_graph.astream(None, config):
            pass
    except Exception as phase2_error:
        print(f"[pipeline_handler] Phase 2 error for job {search_job_id}: {phase2_error}")

    final_state = compiled_pipeline_graph.get_state(config)

    return Phase2PipelineResponse(
        pdf_url=final_state.values.get("pdf_url"),
        pptx_url=final_state.values.get("pptx_url"),
        mockup_url=final_state.values.get("mockup_url"),
        blueprint=final_state.values.get("blueprint"),
        market_size_analysis=final_state.values.get("market_size_analysis"),
        risk_assessment=final_state.values.get("risk_assessment"),
    )
