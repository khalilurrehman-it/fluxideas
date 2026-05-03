from datetime import datetime
from pydantic import BaseModel, Field
from data_models.clustering_agent_data_models import ProblemCluster


class ExistingSolutionCompetitor(BaseModel):
    """A known product or approach that partially addresses the validated problem."""

    competitor_name: str
    competitor_description: str
    key_weakness_or_gap: str = Field(
        description="What this solution fails to do or does poorly"
    )


class ValidatedProblem(BaseModel):
    """A problem cluster that has been scored and enriched with market context."""

    source_problem_cluster: ProblemCluster
    opportunity_gap_score: int = Field(
        ge=1,
        le=10,
        description=(
            "1–3: market saturated | 4–6: gaps exist | 7–9: major gap | 10: no real solution"
        ),
    )
    market_size_estimate: str = Field(
        description="e.g. '$500M–$2B TAM' based on the target segment"
    )
    existing_solutions: list[ExistingSolutionCompetitor] = Field(
        description="2–4 known competitors or workarounds"
    )
    suggested_mvp_approach: str = Field(
        description="Concrete, actionable description of a minimum viable product"
    )
    target_customer_segment: str = Field(
        description="Specific customer segment most likely to pay for a solution"
    )
    monetization_potential: str = Field(
        description="Most likely pricing model and revenue potential"
    )
    validation_reasoning: str = Field(
        description="Why this problem scores as it does — 2–3 sentences"
    )


class ValidationAgentOutput(BaseModel):
    """Output from Agent 3 — all validated problems with market scores."""

    research_topic: str
    search_job_id: str
    validated_problems: list[ValidatedProblem]
    total_problems_validated_count: int
    validation_started_at_utc: datetime
    validation_finished_at_utc: datetime
