from data_models.shared_post_data_models import RawScrapedPost
from external_service_clients.tavily_web_search_api_client import (
    get_authenticated_tavily_web_search_client,
)

# Domains to exclude from general web search (we collect these separately)
DOMAINS_TO_EXCLUDE_FROM_GENERAL_WEB_SEARCH = ["reddit.com", "producthunt.com"]

# Search query templates designed to surface user pain points on the open web
GENERAL_WEB_PAIN_POINT_SEARCH_QUERY_TEMPLATES = [
    '{topic} problems frustrations users complain',
    '{topic} "wish there was" OR "no good solution" OR "struggling with"',
    '{topic} forum discussion pain points',
    'best {topic} tool alternatives missing features',
]

MAXIMUM_TAVILY_RESULTS_PER_WEB_SEARCH_QUERY = 8


def _build_general_web_search_queries_for_topic(research_topic: str) -> list[str]:
    """Builds pain-point-focused web search queries for the given research topic."""
    return [
        query_template.format(topic=research_topic)
        for query_template in GENERAL_WEB_PAIN_POINT_SEARCH_QUERY_TEMPLATES
    ]


def _convert_tavily_web_result_to_raw_scraped_post(
    tavily_web_result: dict,
) -> RawScrapedPost:
    """Converts a Tavily web search result dict into our RawScrapedPost model."""
    return RawScrapedPost(
        post_source_platform="tavily_web",
        post_title=tavily_web_result.get("title", ""),
        post_body_text=tavily_web_result.get("content", ""),
        post_source_url=tavily_web_result.get("url", ""),
        post_upvote_or_relevance_score=int(
            tavily_web_result.get("score", 0) * 100
        ),
    )


async def collect_general_web_pain_point_posts_for_topic(
    research_topic: str,
) -> list[RawScrapedPost]:
    """
    Searches the open web via Tavily using pain-point-focused queries.
    Excludes Reddit and Product Hunt since those are collected separately.
    Returns a deduplicated list of RawScrapedPost objects.
    """
    tavily_client = get_authenticated_tavily_web_search_client()

    web_search_queries = _build_general_web_search_queries_for_topic(research_topic)
    all_web_posts_collected: list[RawScrapedPost] = []
    seen_web_post_urls: set[str] = set()

    for web_search_query in web_search_queries:
        try:
            tavily_web_search_response = tavily_client.search(
                query=web_search_query,
                search_depth="advanced",
                exclude_domains=DOMAINS_TO_EXCLUDE_FROM_GENERAL_WEB_SEARCH,
                max_results=MAXIMUM_TAVILY_RESULTS_PER_WEB_SEARCH_QUERY,
            )

            web_search_result_items: list[dict] = tavily_web_search_response.get("results", [])

            for web_result_item in web_search_result_items:
                result_url = web_result_item.get("url", "")
                result_content = web_result_item.get("content", "")

                if not result_content or result_url in seen_web_post_urls:
                    continue

                seen_web_post_urls.add(result_url)
                raw_post = _convert_tavily_web_result_to_raw_scraped_post(web_result_item)
                all_web_posts_collected.append(raw_post)

        except Exception as web_search_collection_error:
            print(f"[tavily_web_collection] Query failed: {web_search_query!r} — {web_search_collection_error}")

    return all_web_posts_collected
