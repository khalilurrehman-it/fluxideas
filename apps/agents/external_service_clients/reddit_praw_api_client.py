import os
import praw
from functools import lru_cache


@lru_cache(maxsize=1)
def get_authenticated_reddit_praw_client() -> praw.Reddit:
    """
    Creates and returns a single authenticated PRAW Reddit client.
    Cached so only one instance exists for the lifetime of the process.
    """
    reddit_client_id = os.environ["REDDIT_CLIENT_ID"]
    reddit_client_secret = os.environ["REDDIT_CLIENT_SECRET"]
    reddit_user_agent = os.environ["REDDIT_USER_AGENT"]

    authenticated_reddit_client = praw.Reddit(
        client_id=reddit_client_id,
        client_secret=reddit_client_secret,
        user_agent=reddit_user_agent,
    )

    return authenticated_reddit_client
