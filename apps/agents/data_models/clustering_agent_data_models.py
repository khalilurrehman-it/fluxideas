from datetime import datetime
from pydantic import BaseModel, Field


class ProblemCluster(BaseModel):
    """A distinct recurring problem pattern identified from raw scraped posts."""

    cluster_id: str = Field(description="e.g. 'cluster_1', 'cluster_2', ...")
    problem_title: str = Field(description="Sharp, specific problem title — max 10 words")
    problem_description: str = Field(description="2–3 sentence description of the problem")
    supporting_evidence_quotes: list[str] = Field(
        description="3–5 direct quotes from posts that support this cluster"
    )
    affected_user_persona: str = Field(
        description="Who has this problem — e.g. 'Freelance developers', 'SaaS founders'"
    )
    estimated_frequency_in_collected_posts: int = Field(
        ge=0,
        description="Estimated number of collected posts that mention this problem",
    )
    primary_data_sources: list[str] = Field(
        description="Which sources this pattern appears in — e.g. ['reddit', 'product_hunt']"
    )


class ClusteringAgentOutput(BaseModel):
    """Output from Agent 2 — all problem clusters identified from the scraped posts."""

    research_topic: str
    search_job_id: str
    identified_problem_clusters: list[ProblemCluster]
    total_clusters_identified_count: int
    total_posts_analyzed_count: int
    clustering_started_at_utc: datetime
    clustering_finished_at_utc: datetime
