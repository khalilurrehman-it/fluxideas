import os
import cloudinary
import cloudinary.uploader
from functools import lru_cache


@lru_cache(maxsize=1)
def get_configured_cloudinary_client() -> cloudinary.config:
    """
    Configures and returns the Cloudinary SDK with credentials from environment.
    Cached so configuration only runs once per process lifetime.
    """
    cloudinary_config = cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
        secure=True,
    )
    return cloudinary_config
