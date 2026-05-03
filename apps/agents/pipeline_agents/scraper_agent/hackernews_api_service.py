import urllib.parse
from datetime import datetime

import httpx

from data_models.shared_post_data_models import RawScrapedPost

# Maximum results to request from the HN Algolia API
_HN_HITS_PER_PAGE = 15

# Minimum comment length to be considered a useful signal
_MINIMUM_COMMENT_LENGTH = 50

# Hard cap on posts returned by this service
_MAXIMUM_POSTS_TO_RETURN = 15


def _clean_hn_html(text: str) -> str:
    """Strip basic HTML entities and tags that HN comments contain."""
    return (
        text.replace("<p>", "\n").replace("</p>", "")
        .replace("<i>", "").replace("</i>", "")
        .replace("<a>", "").replace("</a>", "")
        .replace("<b>", "").replace("</b>", "")
        .replace("&#x27;", "'").replace("&amp;", "&")
        .replace("&lt;", "<").replace("&gt;", ">")
    )


def _hit_to_raw_scraped_post(hit: dict) -> RawScrapedPost | None:
    """Converts a single HN Algolia hit dict into a RawScrapedPost. Returns None if invalid."""
    text = hit.get("comment_text", "")
    if not text or len(text) < _MINIMUM_COMMENT_LENGTH:
        return None

    clean_text = _clean_hn_html(text)
    obj_id = hit.get("objectID", "")
    author = hit.get("author", "anonymous")
    story_title = (
        hit.get("story_title")
        or hit.get("story_text", "")[:60]
        or "HN Discussion"
    )
    hn_url = (
        f"https://news.ycombinator.com/item?id={obj_id}"
        if obj_id
        else "https://news.ycombinator.com"
    )
    created_at_str = (hit.get("created_at", "") or "")[:10]

    try:
        collected_at = datetime.fromisoformat(created_at_str) if created_at_str else datetime.utcnow()
    except ValueError:
        collected_at = datetime.utcnow()

    return RawScrapedPost(
        post_source_platform="tavily_web",  # closest available literal; HN is web-based
        post_title=story_title,
        post_body_text=clean_text,
        post_source_url=hn_url,
        post_upvote_or_relevance_score=0,
        post_collected_at_utc=collected_at,
        post_subreddit_name="HackerNews",
    )


async def collect_hackernews_pain_point_posts(topic: str) -> list[RawScrapedPost]:
    """
    Queries the HackerNews Algolia API for comments about the given topic that
    contain pain-point signals. Returns up to _MAXIMUM_POSTS_TO_RETURN posts.

    Uses httpx.AsyncClient for async-native I/O — no thread pool needed.
    """
    query = urllib.parse.quote(f"{topic} problem pain")
    url = (
        f"https://hn.algolia.com/api/v1/search"
        f"?query={query}&tags=comment&hitsPerPage={_HN_HITS_PER_PAGE}"
    )

    collected_posts: list[RawScrapedPost] = []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            hits = response.json().get("hits", [])

            for hit in hits:
                post = _hit_to_raw_scraped_post(hit)
                if post is not None:
                    collected_posts.append(post)
                if len(collected_posts) >= _MAXIMUM_POSTS_TO_RETURN:
                    break

        # Broader fallback if primary query returned nothing
        if not collected_posts:
            fallback_query = urllib.parse.quote(topic)
            fallback_url = (
                f"https://hn.algolia.com/api/v1/search"
                f"?query={fallback_query}&tags=comment&hitsPerPage={_HN_HITS_PER_PAGE}"
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(fallback_url)
                response.raise_for_status()
                hits = response.json().get("hits", [])
                for hit in hits:
                    post = _hit_to_raw_scraped_post(hit)
                    if post is not None:
                        collected_posts.append(post)
                    if len(collected_posts) >= _MAXIMUM_POSTS_TO_RETURN:
                        break

    except Exception as err:
        print(f"[hackernews_api_service] Error fetching HN posts: {err}")

    return collected_posts[:_MAXIMUM_POSTS_TO_RETURN]
