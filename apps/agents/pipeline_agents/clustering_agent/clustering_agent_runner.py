from datetime import datetime

from data_models.shared_post_data_models import ScraperAgentOutput
from data_models.clustering_agent_data_models import ClusteringAgentOutput
from pipeline_log_streaming.agent_progress_log_event_streamer import (
    stream_agent_progress_log_event_to_nodejs_backend,
)
from pipeline_agents.clustering_agent.raw_posts_to_problem_clusters_claude_service import (
    identify_problem_clusters_from_raw_posts_using_claude,
)


async def run_clustering_agent_and_identify_problem_patterns(
    scraper_agent_output: ScraperAgentOutput,
) -> ClusteringAgentOutput:
    """
    Agent 2 — Clustering.

    Takes the raw posts from Agent 1 and sends them to Claude to identify
    distinct recurring problem patterns. Returns a ClusteringAgentOutput
    containing all identified problem clusters.

    This is the intelligence layer — Claude reads hundreds of user complaints
    and distills them into a clean set of named, described problem clusters.
    """
    clustering_started_at_utc = datetime.utcnow()
    search_job_id = scraper_agent_output.search_job_id
    research_topic = scraper_agent_output.research_topic
    total_posts_count = scraper_agent_output.total_posts_collected_count

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="clustering",
        human_readable_log_message=(
            f"🧠  Claude is analyzing {total_posts_count} posts — identifying problem patterns..."
        ),
    )

    identified_problem_clusters = await identify_problem_clusters_from_raw_posts_using_claude(
        research_topic=research_topic,
        all_raw_posts=scraper_agent_output.all_collected_raw_posts,
    )

    total_clusters_found = len(identified_problem_clusters)

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="clustering",
        human_readable_log_message=(
            f"🧠  Clustering complete — {total_clusters_found} distinct problem patterns identified ✓"
        ),
    )

    clustering_finished_at_utc = datetime.utcnow()

    return ClusteringAgentOutput(
        research_topic=research_topic,
        search_job_id=search_job_id,
        identified_problem_clusters=identified_problem_clusters,
        total_clusters_identified_count=total_clusters_found,
        total_posts_analyzed_count=total_posts_count,
        clustering_started_at_utc=clustering_started_at_utc,
        clustering_finished_at_utc=clustering_finished_at_utc,
    )
