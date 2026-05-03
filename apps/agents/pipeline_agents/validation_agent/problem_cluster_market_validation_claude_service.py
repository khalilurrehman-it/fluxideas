import json
import re
import asyncio
from typing import Callable
from data_models.clustering_agent_data_models import ProblemCluster
from data_models.validation_agent_data_models import ValidatedProblem, ExistingSolutionCompetitor
from external_service_clients.anthropic_claude_api_client import (
    get_authenticated_anthropic_claude_client,
)

# Model for validation — Sonnet 4.6 gives strong market analysis
CLAUDE_MODEL_FOR_VALIDATION = "claude-sonnet-4-6"

# Limit concurrent Claude calls to avoid hitting rate limits
MAXIMUM_CONCURRENT_VALIDATION_CALLS = 3


def _build_validation_prompt_for_problem_cluster(
    research_topic: str,
    problem_cluster: ProblemCluster,
) -> str:
    evidence_text = "\n".join(
        f"  • {quote}" for quote in problem_cluster.supporting_evidence_quotes
    )

    return f"""You are a startup market analyst evaluating whether a user pain point is a real business opportunity.

Research Topic: "{research_topic}"
Problem: "{problem_cluster.problem_title}"
Description: {problem_cluster.problem_description}
Affected users: {problem_cluster.affected_user_persona}

Supporting evidence from users:
{evidence_text}

Analyze this problem and return ONLY valid JSON (no markdown, no explanation):
{{
  "opportunity_gap_score": 7,
  "market_size_estimate": "$500M–$2B TAM",
  "existing_solutions": [
    {{
      "competitor_name": "Product name",
      "competitor_description": "What it does",
      "key_weakness_or_gap": "What it fails to solve"
    }}
  ],
  "suggested_mvp_approach": "Concrete description of an MVP that would solve this — 2–3 sentences",
  "target_customer_segment": "Specific paying customer segment",
  "monetization_potential": "Most likely pricing model and annual revenue potential",
  "validation_reasoning": "2–3 sentences explaining the score and opportunity assessment"
}}

Opportunity gap score guide:
  1–3: Market is well-served with good existing solutions
  4–6: Solutions exist but with significant gaps or poor UX
  7–9: Major unmet need, few or no good solutions
  10: No real solution exists at all, massive underserved demand

Include 2–4 existing solutions/competitors. If none exist for a score of 9–10, say so."""


def _parse_validated_problem_from_claude_response(
    claude_response_text: str,
    source_problem_cluster: ProblemCluster,
) -> ValidatedProblem:
    """
    Parses Claude's JSON response into a ValidatedProblem.
    Strips markdown code blocks if Claude wrapped the JSON.
    """
    cleaned_text = claude_response_text.strip()

    code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned_text)
    if code_block_match:
        cleaned_text = code_block_match.group(1).strip()

    parsed_json = json.loads(cleaned_text)

    raw_existing_solutions: list[dict] = parsed_json.get("existing_solutions", [])
    existing_solution_objects = [
        ExistingSolutionCompetitor(**solution_dict)
        for solution_dict in raw_existing_solutions
    ]

    return ValidatedProblem(
        source_problem_cluster=source_problem_cluster,
        opportunity_gap_score=int(parsed_json["opportunity_gap_score"]),
        market_size_estimate=str(parsed_json.get("market_size_estimate", "Unknown")),
        existing_solutions=existing_solution_objects,
        suggested_mvp_approach=str(parsed_json.get("suggested_mvp_approach", "")),
        target_customer_segment=str(parsed_json.get("target_customer_segment", "")),
        monetization_potential=str(parsed_json.get("monetization_potential", "")),
        validation_reasoning=str(parsed_json.get("validation_reasoning", "")),
    )


async def _validate_single_problem_cluster_with_claude(
    research_topic: str,
    problem_cluster: ProblemCluster,
    concurrency_semaphore: asyncio.Semaphore,
) -> ValidatedProblem | None:
    """
    Calls Claude to validate one problem cluster. Returns None on failure
    so that a single bad cluster doesn't block the rest of the pipeline.
    """
    async with concurrency_semaphore:
        try:
            claude_client = get_authenticated_anthropic_claude_client()

            validation_prompt = _build_validation_prompt_for_problem_cluster(
                research_topic, problem_cluster
            )

            claude_response = await claude_client.messages.create(
                model=CLAUDE_MODEL_FOR_VALIDATION,
                max_tokens=2048,
                messages=[
                    {
                        "role": "user",
                        "content": validation_prompt,
                    }
                ],
            )

            response_text = claude_response.content[0].text
            return _parse_validated_problem_from_claude_response(response_text, problem_cluster)

        except Exception as validation_error:
            print(
                f"[validation_service] Failed to validate cluster "
                f"'{problem_cluster.problem_title}': {validation_error}"
            )
            return None


async def validate_all_problem_clusters_using_claude(
    research_topic: str,
    problem_clusters: list[ProblemCluster],
    on_each_cluster_validated_callback: Callable | None = None,
) -> list[ValidatedProblem]:
    """
    Validates all problem clusters in parallel (up to MAXIMUM_CONCURRENT_VALIDATION_CALLS
    at a time) by calling Claude for each one. Failed validations are skipped.
    Results are sorted by opportunity_gap_score descending.
    """
    concurrency_semaphore = asyncio.Semaphore(MAXIMUM_CONCURRENT_VALIDATION_CALLS)

    validation_tasks = [
        _validate_single_problem_cluster_with_claude(
            research_topic,
            cluster,
            concurrency_semaphore,
        )
        for cluster in problem_clusters
    ]

    validation_results: list[ValidatedProblem | None] = await asyncio.gather(*validation_tasks)

    successfully_validated_problems: list[ValidatedProblem] = [
        validated_problem
        for validated_problem in validation_results
        if validated_problem is not None
    ]

    # Sort by opportunity gap score — highest first
    successfully_validated_problems.sort(
        key=lambda validated_problem: validated_problem.opportunity_gap_score,
        reverse=True,
    )

    return successfully_validated_problems
