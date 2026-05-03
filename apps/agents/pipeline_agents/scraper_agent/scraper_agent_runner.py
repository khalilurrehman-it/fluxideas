import asyncio
from datetime import datetime

from data_models.shared_post_data_models import RawScrapedPost, ScraperAgentOutput
from pipeline_log_streaming.agent_progress_log_event_streamer import (
    stream_agent_progress_log_event_to_nodejs_backend,
)
from pipeline_agents.scraper_agent.reddit_post_collection_service import (
    collect_all_reddit_pain_point_posts_for_topic,
)
from pipeline_agents.scraper_agent.product_hunt_discussion_collection_service import (
    collect_product_hunt_discussion_posts_for_topic,
)
from pipeline_agents.scraper_agent.google_trends_data_collection_service import (
    collect_google_trends_rising_queries_for_topic,
)
from pipeline_agents.scraper_agent.tavily_web_search_collection_service import (
    collect_general_web_pain_point_posts_for_topic,
)


async def run_scraper_agent_and_collect_all_raw_posts(
    research_topic: str,
    search_job_id: str,
) -> ScraperAgentOutput:
    """
    Agent 1 — Scraper.

    Runs all four data collection services in parallel using asyncio.gather,
    streams live progress logs to the frontend via the Node.js WebSocket server,
    and returns a ScraperAgentOutput containing every raw post collected.

    Parallel sources:
      1. Reddit (PRAW) — subreddit search across entrepreneur, SaaS, startups, etc.
      2. Product Hunt (Tavily) — discussions and feature request pages
      3. Google Trends (Pytrends) — rising and top related queries
      4. Open Web (Tavily) — general pain-point-focused web search

    This output is passed directly to Agent 2 (clustering).
    """
    scraper_started_at_utc = datetime.utcnow()

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message="🔍  Connecting to all data sources...",
    )

    # ------------------------------------------------------------------
    # Launch all four collection services simultaneously
    # ------------------------------------------------------------------
    (
        reddit_collected_posts,
        product_hunt_collected_posts,
        google_trends_collected_posts,
        tavily_web_collected_posts,
    ) = await asyncio.gather(
        _run_reddit_collection_with_live_logging(research_topic, search_job_id),
        _run_product_hunt_collection_with_live_logging(research_topic, search_job_id),
        _run_google_trends_collection_with_live_logging(research_topic, search_job_id),
        _run_tavily_web_collection_with_live_logging(research_topic, search_job_id),
        return_exceptions=False,
    )

    # ------------------------------------------------------------------
    # Combine all collected posts into one flat list
    # ------------------------------------------------------------------
    all_raw_posts_combined: list[RawScrapedPost] = (
        reddit_collected_posts
        + product_hunt_collected_posts
        + google_trends_collected_posts
        + tavily_web_collected_posts
    )

    scraper_finished_at_utc = datetime.utcnow()
    total_posts_collected_count = len(all_raw_posts_combined)

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message=(
            f"🔍  Collection complete — {total_posts_collected_count} total posts gathered ✓"
        ),
    )

    return ScraperAgentOutput(
        research_topic=research_topic,
        search_job_id=search_job_id,
        all_collected_raw_posts=all_raw_posts_combined,
        total_posts_collected_count=total_posts_collected_count,
        reddit_posts_collected_count=len(reddit_collected_posts),
        product_hunt_posts_collected_count=len(product_hunt_collected_posts),
        google_trends_queries_collected_count=len(google_trends_collected_posts),
        tavily_web_search_posts_collected_count=len(tavily_web_collected_posts),
        scraper_started_at_utc=scraper_started_at_utc,
        scraper_finished_at_utc=scraper_finished_at_utc,
    )


# ------------------------------------------------------------------
# Private helpers — each wraps a collector with live log streaming
# ------------------------------------------------------------------

async def _run_reddit_collection_with_live_logging(
    research_topic: str,
    search_job_id: str,
) -> list[RawScrapedPost]:
    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message="🔍  Connecting to Reddit API...",
    )

    collected_reddit_posts = await collect_all_reddit_pain_point_posts_for_topic(research_topic)

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message=(
            f"🔍  Reddit — {len(collected_reddit_posts)} posts collected across subreddits"
        ),
    )

    return collected_reddit_posts


async def _run_product_hunt_collection_with_live_logging(
    research_topic: str,
    search_job_id: str,
) -> list[RawScrapedPost]:
    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message="🔍  Searching Product Hunt discussions...",
    )

    collected_product_hunt_posts = await collect_product_hunt_discussion_posts_for_topic(
        research_topic
    )

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message=(
            f"🔍  Product Hunt — {len(collected_product_hunt_posts)} discussions found"
        ),
    )

    return collected_product_hunt_posts


async def _run_google_trends_collection_with_live_logging(
    research_topic: str,
    search_job_id: str,
) -> list[RawScrapedPost]:
    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message="🔍  Fetching Google Trends data...",
    )

    collected_google_trends_posts = await collect_google_trends_rising_queries_for_topic(
        research_topic
    )

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message=(
            f"🔍  Google Trends — {len(collected_google_trends_posts)} rising queries collected ✓"
        ),
    )

    return collected_google_trends_posts


async def _run_tavily_web_collection_with_live_logging(
    research_topic: str,
    search_job_id: str,
) -> list[RawScrapedPost]:
    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message="🔍  Running open web search...",
    )

    collected_web_posts = await collect_general_web_pain_point_posts_for_topic(research_topic)

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message=(
            f"🔍  Open web — {len(collected_web_posts)} relevant pages found"
        ),
    )

    return collected_web_posts
