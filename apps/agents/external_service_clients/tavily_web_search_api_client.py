import os
from tavily import TavilyClient
from functools import lru_cache


@lru_cache(maxsize=1)
def get_authenticated_tavily_web_search_client() -> TavilyClient:
    """
    Creates and returns a single authenticated Tavily search client.
    Cached so only one instance exists for the lifetime of the process.
    """
    tavily_api_key = os.environ["TAVILY_API_KEY"]
    authenticated_tavily_client = TavilyClient(api_key=tavily_api_key)
    return authenticated_tavily_client
