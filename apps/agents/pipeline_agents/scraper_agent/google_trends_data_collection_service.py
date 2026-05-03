import asyncio
from datetime import datetime

from data_models.shared_post_data_models import RawScrapedPost
from external_service_clients.google_trends_pytrends_client import (
    get_google_trends_pytrends_client,
)

# Time range to query — last 12 months gives a good signal of sustained interest
GOOGLE_TRENDS_QUERY_TIME_RANGE = "today 12-m"

# Geographic scope — worldwide
GOOGLE_TRENDS_GEOGRAPHIC_scope = ""

# Minimum relative search interest score (0-100) to include a trending query
MINIMUM_GOOGLE_TRENDS_INTEREST_SCORE_THRESHOLD = 10

# Maximum number of related rising queries to collect per topic keyword
MAXIMUM_RISING_RELATED_QUERIES_TO_COLLECT = 20


def _collect_google_trends_data_synchronously(research_topic: str) -> list[RawScrapedPost]:
    """
    Synchronous function that queries Google Trends for the research topic
    and returns rising related queries as RawScrapedPost objects.
    Runs in a thread pool executor since Pytrends is synchronous.
    """
    google_trends_client = get_google_trends_pytrends_client()
    collected_trending_query_posts: list[RawScrapedPost] = []

    try:
        google_trends_client.build_payload(
            kw_list=[research_topic],
            timeframe=GOOGLE_TRENDS_QUERY_TIME_RANGE,
            geo=GOOGLE_TRENDS_GEOGRAPHIC_scope,
        )

        related_queries_dataframe_dict = google_trends_client.related_queries()
        topic_related_queries = related_queries_dataframe_dict.get(research_topic, {})

        rising_related_queries_dataframe = topic_related_queries.get("rising")
        top_related_queries_dataframe = topic_related_queries.get("top")

        # Process rising queries — these show accelerating search demand
        if rising_related_queries_dataframe is not None and not rising_related_queries_dataframe.empty:
            rising_queries_limited = rising_related_queries_dataframe.head(
                MAXIMUM_RISING_RELATED_QUERIES_TO_COLLECT
            )
            for _, rising_query_row in rising_queries_limited.iterrows():
                rising_query_text: str = str(rising_query_row.get("query", ""))
                rising_query_value: int = int(rising_query_row.get("value", 0))

                if not rising_query_text:
                    continue

                trending_query_post = RawScrapedPost(
                    post_source_platform="google_trends",
                    post_title=f"Rising search trend: {rising_query_text}",
                    post_body_text=(
                        f"People are increasingly searching for '{rising_query_text}' "
                        f"in the context of {research_topic}. "
                        f"Breakout/rising interest score: {rising_query_value}."
                    ),
                    post_source_url=f"https://trends.google.com/trends/explore?q={rising_query_text.replace(' ', '+')}",
                    post_upvote_or_relevance_score=min(rising_query_value, 100),
                    post_collected_at_utc=datetime.utcnow(),
                )
                collected_trending_query_posts.append(trending_query_post)

        # Also process top queries with meaningful interest scores
        if top_related_queries_dataframe is not None and not top_related_queries_dataframe.empty:
            top_queries_limited = top_related_queries_dataframe.head(10)
            for _, top_query_row in top_queries_limited.iterrows():
                top_query_text: str = str(top_query_row.get("query", ""))
                top_query_value: int = int(top_query_row.get("value", 0))

                if not top_query_text or top_query_value < MINIMUM_GOOGLE_TRENDS_INTEREST_SCORE_THRESHOLD:
                    continue

                top_query_post = RawScrapedPost(
                    post_source_platform="google_trends",
                    post_title=f"High-search-volume query: {top_query_text}",
                    post_body_text=(
                        f"'{top_query_text}' is among the most searched queries "
                        f"related to {research_topic}, with a relative interest score of {top_query_value}/100."
                    ),
                    post_source_url=f"https://trends.google.com/trends/explore?q={top_query_text.replace(' ', '+')}",
                    post_upvote_or_relevance_score=top_query_value,
                    post_collected_at_utc=datetime.utcnow(),
                )
                collected_trending_query_posts.append(top_query_post)

    except Exception as google_trends_collection_error:
        print(f"[google_trends_collection] Failed to collect trends data: {google_trends_collection_error}")

    return collected_trending_query_posts


async def collect_google_trends_rising_queries_for_topic(
    research_topic: str,
) -> list[RawScrapedPost]:
    """
    Async entry point for Google Trends collection.
    Runs the synchronous Pytrends call in a thread pool to avoid blocking.
    """
    loop = asyncio.get_event_loop()
    collected_trending_posts = await loop.run_in_executor(
        None,
        _collect_google_trends_data_synchronously,
        research_topic,
    )
    return collected_trending_posts
