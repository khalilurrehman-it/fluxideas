from data_models.shared_post_data_models import RawScrapedPost
from external_service_clients.tavily_web_search_api_client import (
    get_authenticated_tavily_web_search_client,
)

# Product Hunt domains Tavily should focus on
PRODUCT_HUNT_TARGET_DOMAIN_FILTERS = ["producthunt.com"]

# Search query templates that surface discussions where users express needs
PRODUCT_HUNT_SEARCH_QUERY_TEMPLATES = [
    '{topic} site:producthunt.com discussion',
    '{topic} "looking for" OR "need a tool" site:producthunt.com',
    '{topic} alternatives site:producthunt.com',
]

# Maximum total results to request from Tavily per query
MAXIMUM_TAVILY_RESULTS_PER_PRODUCT_HUNT_QUERY = 10


def _build_product_hunt_search_queries_for_topic(research_topic: str) -> list[str]:
    """Builds a list of Tavily search queries targeting Product Hunt for the given topic."""
    return [
        query_template.format(topic=research_topic)
        for query_template in PRODUCT_HUNT_SEARCH_QUERY_TEMPLATES
    ]


def _convert_tavily_search_result_to_raw_scraped_post(
    tavily_search_result: dict,
) -> RawScrapedPost:
    """Converts a single Tavily search result dict into our RawScrapedPost model."""
    return RawScrapedPost(
        post_source_platform="product_hunt",
        post_title=tavily_search_result.get("title", ""),
        post_body_text=tavily_search_result.get("content", ""),
        post_source_url=tavily_search_result.get("url", ""),
        post_upvote_or_relevance_score=int(
            tavily_search_result.get("score", 0) * 100
        ),
    )


async def collect_product_hunt_discussion_posts_for_topic(
    research_topic: str,
) -> list[RawScrapedPost]:
    """
    Searches Product Hunt via Tavily for discussions related to the research topic.
    Returns a list of RawScrapedPost objects from Product Hunt pages.
    """
    tavily_client = get_authenticated_tavily_web_search_client()

    search_queries_for_product_hunt = _build_product_hunt_search_queries_for_topic(research_topic)
    all_product_hunt_posts: list[RawScrapedPost] = []
    seen_product_hunt_post_urls: set[str] = set()

    for search_query in search_queries_for_product_hunt:
        try:
            tavily_search_response = tavily_client.search(
                query=search_query,
                search_depth="basic",
                include_domains=PRODUCT_HUNT_TARGET_DOMAIN_FILTERS,
                max_results=MAXIMUM_TAVILY_RESULTS_PER_PRODUCT_HUNT_QUERY,
            )

            tavily_result_items: list[dict] = tavily_search_response.get("results", [])

            for tavily_result_item in tavily_result_items:
                result_url = tavily_result_item.get("url", "")
                result_content = tavily_result_item.get("content", "")

                # Skip empty results and duplicates
                if not result_content or result_url in seen_product_hunt_post_urls:
                    continue

                seen_product_hunt_post_urls.add(result_url)
                raw_scraped_post = _convert_tavily_search_result_to_raw_scraped_post(
                    tavily_result_item
                )
                all_product_hunt_posts.append(raw_scraped_post)

        except Exception as product_hunt_collection_error:
            print(f"[product_hunt_collection] Query failed: {search_query!r} — {product_hunt_collection_error}")

    return all_product_hunt_posts
