from datetime import datetime
from fastapi import APIRouter

health_check_api_router = APIRouter()


@health_check_api_router.get("/health")
async def handle_health_check_request() -> dict:
    """Returns a simple health check response so Railway and Node.js can verify the service is up."""
    return {
        "status": "ok",
        "service": "FluxIdeas-agent-pipeline",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
