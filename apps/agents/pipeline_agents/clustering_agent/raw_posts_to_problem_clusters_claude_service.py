import json
import re
from data_models.shared_post_data_models import RawScrapedPost
from data_models.clustering_agent_data_models import ProblemCluster
from external_service_clients.anthropic_claude_api_client import (
    get_authenticated_anthropic_claude_client,
)

# Model to use for clustering — Sonnet 4.6 is fast and highly capable for this task
CLAUDE_MODEL_FOR_CLUSTERING = "claude-sonnet-4-6"

# Maximum number of posts to send to Claude (keep token count manageable)
MAXIMUM_POSTS_TO_SEND_TO_CLAUDE_FOR_CLUSTERING = 80

# Maximum characters to include per post (title + body combined)
MAXIMUM_CHARACTERS_PER_POST_BODY_FOR_CLAUDE = 350
MAXIMUM_CHARACTERS_PER_POST_TITLE_FOR_CLAUDE = 120

# How many problem clusters we want Claude to identify
MINIMUM_PROBLEM_CLUSTERS_TO_IDENTIFY = 5
MAXIMUM_PROBLEM_CLUSTERS_TO_IDENTIFY = 12


def _select_and_format_top_posts_for_clustering_prompt(
    all_raw_posts: list[RawScrapedPost],
) -> str:
    """
    Selects the top posts by relevance score and formats them into
    a numbered list suitable for inclusion in the Claude prompt.
    Truncates each post to stay within token budget.
    """
    posts_sorted_by_score = sorted(
        all_raw_posts,
        key=lambda post: post.post_upvote_or_relevance_score,
        reverse=True,
    )

    top_posts_selected = posts_sorted_by_score[:MAXIMUM_POSTS_TO_SEND_TO_CLAUDE_FOR_CLUSTERING]

    formatted_post_lines: list[str] = []

    for post_index, raw_post in enumerate(top_posts_selected, start=1):
        truncated_post_title = raw_post.post_title[:MAXIMUM_CHARACTERS_PER_POST_TITLE_FOR_CLAUDE]
        truncated_post_body = raw_post.post_body_text[:MAXIMUM_CHARACTERS_PER_POST_BODY_FOR_CLAUDE]

        source_label = raw_post.post_source_platform.replace("_", " ").title()
        subreddit_suffix = f" r/{raw_post.post_subreddit_name}" if raw_post.post_subreddit_name else ""

        formatted_post_lines.append(
            f"[{post_index}] [{source_label}{subreddit_suffix}] "
            f"TITLE: {truncated_post_title}\n"
            f"    CONTENT: {truncated_post_body}"
        )

    return "\n\n".join(formatted_post_lines)


def _build_clustering_prompt(research_topic: str, formatted_posts_text: str) -> str:
    return f"""You are an expert market researcher analyzing user complaints and pain points from online discussions.

Research Topic: "{research_topic}"

Below are posts collected from Reddit, Product Hunt, Google Trends, and web forums about this topic.

Your task: Identify {MINIMUM_PROBLEM_CLUSTERS_TO_IDENTIFY}–{MAXIMUM_PROBLEM_CLUSTERS_TO_IDENTIFY} distinct, recurring PROBLEMS that users are actively experiencing.

Rules:
- Focus on real frustrations and unmet needs — NOT requests for minor feature tweaks
- Each cluster must be a distinct problem, not a variation of another
- Prioritize problems where NO good solution currently exists
- Use direct quotes from the posts as supporting evidence

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{{
  "clusters": [
    {{
      "cluster_id": "cluster_1",
      "problem_title": "Short sharp problem title — max 10 words",
      "problem_description": "2–3 sentence description explaining the core frustration and why existing solutions fall short.",
      "supporting_evidence_quotes": [
        "Exact or near-exact quote from a post...",
        "Another quote...",
        "Another quote..."
      ],
      "affected_user_persona": "Who has this problem e.g. Freelance developers, Early-stage SaaS founders",
      "estimated_frequency_in_collected_posts": 8,
      "primary_data_sources": ["reddit", "product_hunt"]
    }}
  ]
}}

POSTS TO ANALYZE:
{formatted_posts_text}"""


def _extract_json_from_claude_response_text(claude_response_text: str) -> dict:
    """
    Extracts JSON from Claude's response text.
    Handles cases where Claude wraps the JSON in markdown code blocks.
    """
    cleaned_text = claude_response_text.strip()

    # Strip markdown code blocks if present
    code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned_text)
    if code_block_match:
        cleaned_text = code_block_match.group(1).strip()

    return json.loads(cleaned_text)


async def identify_problem_clusters_from_raw_posts_using_claude(
    research_topic: str,
    all_raw_posts: list[RawScrapedPost],
) -> list[ProblemCluster]:
    """
    Sends the top collected posts to Claude and asks it to identify
    distinct recurring problem clusters. Returns a list of ProblemCluster objects.
    """
    claude_client = get_authenticated_anthropic_claude_client()

    formatted_posts_text = _select_and_format_top_posts_for_clustering_prompt(all_raw_posts)
    clustering_prompt = _build_clustering_prompt(research_topic, formatted_posts_text)

    claude_response = await claude_client.messages.create(
        model=CLAUDE_MODEL_FOR_CLUSTERING,
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": clustering_prompt,
            }
        ],
    )

    response_text = claude_response.content[0].text
    parsed_response_json = _extract_json_from_claude_response_text(response_text)

    raw_cluster_dicts: list[dict] = parsed_response_json.get("clusters", [])

    identified_problem_clusters: list[ProblemCluster] = []
    for raw_cluster_dict in raw_cluster_dicts:
        try:
            problem_cluster = ProblemCluster(**raw_cluster_dict)
            identified_problem_clusters.append(problem_cluster)
        except Exception as cluster_parse_error:
            print(f"[clustering_service] Skipping malformed cluster: {cluster_parse_error}")

    return identified_problem_clusters
