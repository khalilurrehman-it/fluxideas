from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class RawScrapedPost(BaseModel):
    """A single raw post collected from any data source."""

    post_source_platform: Literal["reddit", "product_hunt", "google_trends", "tavily_web"]
    post_title: str
    post_body_text: str
    post_source_url: str
    post_upvote_or_relevance_score: int = Field(ge=0)
    post_collected_at_utc: datetime = Field(default_factory=datetime.utcnow)
    post_subreddit_name: str | None = None


class ScraperAgentOutput(BaseModel):
    """Complete output from Agent 1 — passed directly to Agent 2 (clustering)."""

    research_topic: str
    search_job_id: str
    all_collected_raw_posts: list[RawScrapedPost]
    total_posts_collected_count: int
    reddit_posts_collected_count: int
    product_hunt_posts_collected_count: int
    google_trends_queries_collected_count: int
    tavily_web_search_posts_collected_count: int
    scraper_started_at_utc: datetime
    scraper_finished_at_utc: datetime
