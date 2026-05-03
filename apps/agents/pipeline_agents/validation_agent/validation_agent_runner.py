from datetime import datetime

from data_models.clustering_agent_data_models import ClusteringAgentOutput, ProblemCluster
from data_models.validation_agent_data_models import ValidationAgentOutput, ValidatedProblem
from pipeline_log_streaming.agent_progress_log_event_streamer import (
    stream_agent_progress_log_event_to_nodejs_backend,
)
from pipeline_agents.validation_agent.problem_cluster_market_validation_claude_service import (
    validate_all_problem_clusters_using_claude,
)


async def run_validation_agent_and_score_all_problem_clusters(
    clustering_agent_output: ClusteringAgentOutput,
) -> ValidationAgentOutput:
    """
    Agent 3 — Validation.

    Takes each problem cluster from Agent 2 and calls Claude to:
      - Identify 2–4 existing competitors and their gaps
      - Estimate market size
      - Assign an opportunity gap score (1–10)
      - Suggest an MVP approach
      - Name the target customer segment

    All clusters are validated in parallel (max 3 concurrent Claude calls).
    Results are sorted by opportunity score — highest gap first.
    """
    validation_started_at_utc = datetime.utcnow()
    search_job_id = clustering_agent_output.search_job_id
    research_topic = clustering_agent_output.research_topic
    problem_clusters = clustering_agent_output.identified_problem_clusters
    total_clusters_count = len(problem_clusters)

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="validating",
        human_readable_log_message=(
            f"✅  Validating {total_clusters_count} problem clusters — "
            f"scoring market opportunity..."
        ),
    )

    # Stream individual cluster names as they are picked up for validation
    for problem_cluster in problem_clusters:
        await stream_agent_progress_log_event_to_nodejs_backend(
            search_job_id=search_job_id,
            log_event_type="log",
            pipeline_stage="validating",
            human_readable_log_message=(
                f'✅  Validating: "{problem_cluster.problem_title}"'
            ),
        )

    validated_problems = await validate_all_problem_clusters_using_claude(
        research_topic=research_topic,
        problem_clusters=problem_clusters,
    )

    total_validated_count = len(validated_problems)

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="validating",
        human_readable_log_message=(
            f"✅  Validation complete — {total_validated_count} problems scored ✓"
        ),
    )

    validation_finished_at_utc = datetime.utcnow()

    return ValidationAgentOutput(
        research_topic=research_topic,
        search_job_id=search_job_id,
        validated_problems=validated_problems,
        total_problems_validated_count=total_validated_count,
        validation_started_at_utc=validation_started_at_utc,
        validation_finished_at_utc=validation_finished_at_utc,
    )
