import asyncio
import io
from datetime import datetime
import cloudinary.uploader
from external_service_clients.cloudinary_upload_api_client import get_configured_cloudinary_client


def _upload_pdf_bytes_to_cloudinary_synchronously(
    pdf_bytes: bytes,
    research_topic: str,
    search_job_id: str,
) -> str:
    """
    Synchronous Cloudinary upload — runs in a thread pool executor
    since the Cloudinary SDK is synchronous.
    Returns the secure URL of the uploaded PDF.
    """
    get_configured_cloudinary_client()

    sanitized_topic_for_filename = (
        research_topic.lower()
        .replace(" ", "_")
        .replace("/", "_")
        [:50]
    )
    timestamp_suffix = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    public_id = f"FluxIdeas_reports/{search_job_id}_{sanitized_topic_for_filename}_{timestamp_suffix}"

    upload_result = cloudinary.uploader.upload(
        io.BytesIO(pdf_bytes),
        resource_type="raw",
        public_id=public_id,
        format="pdf",
        overwrite=True,
        invalidate=True,
    )

    secure_pdf_url: str = upload_result["secure_url"]
    return secure_pdf_url


async def upload_pdf_report_bytes_to_cloudinary(
    pdf_bytes: bytes,
    research_topic: str,
    search_job_id: str,
) -> str:
    """
    Async entry point for Cloudinary PDF upload.
    Runs the synchronous SDK call in a thread pool to avoid blocking the event loop.
    Returns the secure Cloudinary URL of the uploaded PDF.
    """
    loop = asyncio.get_event_loop()
    secure_pdf_url = await loop.run_in_executor(
        None,
        _upload_pdf_bytes_to_cloudinary_synchronously,
        pdf_bytes,
        research_topic,
        search_job_id,
    )
    return secure_pdf_url
