from pytrends.request import TrendReq
from functools import lru_cache


@lru_cache(maxsize=1)
def get_google_trends_pytrends_client() -> TrendReq:
    """
    Creates and returns a single Pytrends client configured for
    English-language, US-timezone Google Trends requests.
    """
    google_trends_client = TrendReq(
        hl="en-US",
        tz=360,
        timeout=(10, 30),
        retries=2,
    )
    return google_trends_client
