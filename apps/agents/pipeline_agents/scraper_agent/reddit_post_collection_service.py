import asyncio
import praw
from datetime import datetime

from data_models.shared_post_data_models import RawScrapedPost
from external_service_clients.reddit_praw_api_client import get_authenticated_reddit_praw_client


# Subreddits most likely to contain startup/product complaints and pain-point discussions
GENERAL_STARTUP_AND_ENTREPRENEUR_SUBREDDIT_NAMES = [
    "entrepreneur",
    "SaaS",
    "startups",
    "smallbusiness",
    "digitalnomad",
    "freelance",
    "Entrepreneur",
]

# Keywords that signal a genuine user pain point rather than a promotional post
PAIN_POINT_SIGNAL_KEYWORDS_FOR_FILTERING = [
    "i wish",
    "why is there no",
    "why doesn't",
    "i hate",
    "so frustrating",
    "nobody has",
    "no good tool",
    "can't find",
    "looking for",
    "problem with",
    "struggle with",
    "annoying that",
    "doesn't exist",
    "need a better",
]

# Maximum posts to collect per subreddit to stay within rate limits
MAXIMUM_POSTS_TO_COLLECT_PER_SUBREDDIT = 50

# Maximum top-level comments to read per post
MAXIMUM_TOP_LEVEL_COMMENTS_TO_READ_PER_POST = 5

# Minimum upvotes a post must have to be considered relevant signal
MINIMUM_POST_UPVOTE_SCORE_THRESHOLD = 5


def _does_post_text_contain_pain_point_signal(post_title: str, post_body_text: str) -> bool:
    """Returns True if the post text contains any pain-point signal keywords."""
    combined_post_text_lowercase = (post_title + " " + post_body_text).lower()
    return any(
        keyword in combined_post_text_lowercase
        for keyword in PAIN_POINT_SIGNAL_KEYWORDS_FOR_FILTERING
    )


def _build_subreddit_search_query_for_topic(research_topic: str) -> str:
    """
    Builds a Reddit search query string by combining the topic with
    pain-point signal keywords to surface complaint-style posts.
    """
    return f"{research_topic} (problem OR frustrating OR \"wish there was\" OR \"no good\" OR struggle)"


def _convert_praw_submission_to_raw_scraped_post(
    praw_submission: praw.models.Submission,
    subreddit_name: str,
) -> RawScrapedPost:
    """Converts a PRAW Submission object into our internal RawScrapedPost model."""

    # Collect top comments to enrich the body text
    praw_submission.comments.replace_more(limit=0)
    top_comment_texts = [
        comment.body
        for comment in praw_submission.comments.list()[:MAXIMUM_TOP_LEVEL_COMMENTS_TO_READ_PER_POST]
        if hasattr(comment, "body")
    ]
    enriched_body_text_with_comments = (
        (praw_submission.selftext or "")
        + "\n\nTop comments:\n"
        + "\n".join(top_comment_texts)
    ).strip()

    return RawScrapedPost(
        post_source_platform="reddit",
        post_title=praw_submission.title,
        post_body_text=enriched_body_text_with_comments,
        post_source_url=f"https://reddit.com{praw_submission.permalink}",
        post_upvote_or_relevance_score=praw_submission.score,
        post_collected_at_utc=datetime.utcfromtimestamp(praw_submission.created_utc),
        post_subreddit_name=subreddit_name,
    )


def _collect_pain_point_posts_from_single_subreddit(
    authenticated_reddit_client: praw.Reddit,
    subreddit_name: str,
    research_topic: str,
) -> list[RawScrapedPost]:
    """
    Searches a single subreddit for posts related to the research topic
    that contain pain-point signal keywords. Returns filtered RawScrapedPost list.
    """
    subreddit_search_query = _build_subreddit_search_query_for_topic(research_topic)
    collected_raw_posts_from_subreddit: list[RawScrapedPost] = []

    try:
        subreddit_instance = authenticated_reddit_client.subreddit(subreddit_name)
        search_results_generator = subreddit_instance.search(
            query=subreddit_search_query,
            sort="relevance",
            time_filter="year",
            limit=MAXIMUM_POSTS_TO_COLLECT_PER_SUBREDDIT,
        )

        for praw_submission in search_results_generator:
            if praw_submission.score < MINIMUM_POST_UPVOTE_SCORE_THRESHOLD:
                continue

            post_body_text = praw_submission.selftext or ""
            if not _does_post_text_contain_pain_point_signal(praw_submission.title, post_body_text):
                continue

            raw_scraped_post = _convert_praw_submission_to_raw_scraped_post(
                praw_submission=praw_submission,
                subreddit_name=subreddit_name,
            )
            collected_raw_posts_from_subreddit.append(raw_scraped_post)

    except Exception as subreddit_collection_error:
        # Log and skip — a single subreddit failing should not block the pipeline
        print(f"[reddit_collection] Failed to collect from r/{subreddit_name}: {subreddit_collection_error}")

    return collected_raw_posts_from_subreddit


async def collect_all_reddit_pain_point_posts_for_topic(
    research_topic: str,
) -> list[RawScrapedPost]:
    """
    Main entry point for the Reddit collection service.
    Searches all configured subreddits in parallel using asyncio and
    returns a deduplicated list of RawScrapedPost objects.
    """
    authenticated_reddit_client = get_authenticated_reddit_praw_client()

    # PRAW is synchronous — run each subreddit search in a thread pool
    loop = asyncio.get_event_loop()

    async def collect_from_subreddit_in_thread(subreddit_name: str) -> list[RawScrapedPost]:
        return await loop.run_in_executor(
            None,
            _collect_pain_point_posts_from_single_subreddit,
            authenticated_reddit_client,
            subreddit_name,
            research_topic,
        )

    all_subreddit_collection_tasks = [
        collect_from_subreddit_in_thread(subreddit_name)
        for subreddit_name in GENERAL_STARTUP_AND_ENTREPRENEUR_SUBREDDIT_NAMES
    ]

    subreddit_results_per_thread: list[list[RawScrapedPost]] = await asyncio.gather(
        *all_subreddit_collection_tasks,
        return_exceptions=False,
    )

    # Flatten results from all subreddits into a single list
    all_reddit_posts_combined: list[RawScrapedPost] = [
        post
        for subreddit_post_list in subreddit_results_per_thread
        for post in subreddit_post_list
    ]

    # Deduplicate by URL to avoid counting the same post twice
    seen_post_urls: set[str] = set()
    deduplicated_reddit_posts: list[RawScrapedPost] = []
    for reddit_post in all_reddit_posts_combined:
        if reddit_post.post_source_url not in seen_post_urls:
            seen_post_urls.add(reddit_post.post_source_url)
            deduplicated_reddit_posts.append(reddit_post)

    return deduplicated_reddit_posts
