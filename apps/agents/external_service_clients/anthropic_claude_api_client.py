import os
import anthropic
from functools import lru_cache


@lru_cache(maxsize=1)
def get_authenticated_anthropic_claude_client() -> anthropic.AsyncAnthropic:
    """
    Creates and returns a single authenticated async Anthropic client.
    Cached so only one instance exists for the lifetime of the process.
    """
    anthropic_api_key = os.environ["ANTHROPIC_API_KEY"]
    return anthropic.AsyncAnthropic(api_key=anthropic_api_key)
