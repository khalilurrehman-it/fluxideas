import asyncio
from datetime import datetime

from data_models.shared_post_data_models import RawScrapedPost

# Maximum results per query
_MAX_RESULTS_PER_QUERY = 4

# Minimum text length to be considered a useful result
_MINIMUM_TEXT_LENGTH = 50

# Hard cap on posts returned by this service
_MAXIMUM_POSTS_TO_RETURN = 20


def _build_ddgs_queries(topic: str) -> list[str]:
    """Returns the 5 multi-source intelligence queries for a given topic."""
    return [
        f"site:reddit.com {topic} pain points",
        f"site:producthunt.com {topic} complaints alternatives",
        f"{topic} frustrating problems users",
        f"best {topic} software but missing features",
        f"{topic} what's broken",
    ]


def _infer_source_label(url: str) -> str:
    """Determine source platform from URL."""
    if "reddit.com" in url:
        return "Reddit"
    if "producthunt.com" in url:
        return "ProductHunt"
    if "youtube.com" in url:
        return "YouTube"
    return "Web"


def _run_ddgs_synchronously(queries: list[str]) -> list[dict]:
    """
    Execute all DuckDuckGo text queries synchronously.
    DDGS is a synchronous library — this function is intended to be run
    inside asyncio.get_event_loop().run_in_executor().
    """
    results: list[dict] = []
    try:
        from ddgs import DDGS
        with DDGS() as ddgs:
            for query in queries:
                try:
                    for r in ddgs.text(query, max_results=_MAX_RESULTS_PER_QUERY):
                        text = r.get("body", "")
                        if len(text) < _MINIMUM_TEXT_LENGTH:
                            continue
                        title = r.get("title", "Search Result")
                        url = r.get("href", "")
                        source_label = _infer_source_label(url)
                        results.append({
                            "text": text,
                            "title": title,
                            "url": url,
                            "source_label": source_label,
                        })
                except Exception as query_err:
                    print(f"[duckduckgo_search_service] Query error '{query}': {query_err}")
    except Exception as ddgs_err:
        print(f"[duckduckgo_search_service] DDGS init error: {ddgs_err}")
    return results


async def collect_duckduckgo_pain_point_posts(topic: str) -> list[RawScrapedPost]:
    """
    Runs 5 DuckDuckGo multi-source queries for the given topic and returns up to
    _MAXIMUM_POSTS_TO_RETURN RawScrapedPost objects.

    DDGS is synchronous-only, so the call is offloaded to a thread pool executor
    to avoid blocking the async event loop.
    """
    queries = _build_ddgs_queries(topic)
    loop = asyncio.get_event_loop()

    try:
        raw_results = await loop.run_in_executor(None, _run_ddgs_synchronously, queries)
    except Exception as err:
        print(f"[duckduckgo_search_service] Executor error: {err}")
        raw_results = []

    collected_posts: list[RawScrapedPost] = []
    now = datetime.utcnow()

    for r in raw_results:
        post = RawScrapedPost(
            post_source_platform="tavily_web",  # closest available literal for web results
            post_title=r["title"],
            post_body_text=r["text"],
            post_source_url=r["url"],
            post_upvote_or_relevance_score=0,
            post_collected_at_utc=now,
            post_subreddit_name=r["source_label"] if r["source_label"] != "Web" else None,
        )
        collected_posts.append(post)
        if len(collected_posts) >= _MAXIMUM_POSTS_TO_RETURN:
            break

    return collected_posts
