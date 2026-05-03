import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from api_route_handlers.health_check_route_handler import health_check_api_router
from api_route_handlers.pipeline_execution_route_handler import pipeline_execution_api_router

load_dotenv()


@asynccontextmanager
async def application_lifespan(app: FastAPI):
    """Startup and shutdown lifecycle hook."""
    print("[FluxIdeas-agents] Agent pipeline service starting up...")
    yield
    print("[FluxIdeas-agents] Agent pipeline service shutting down.")


def create_fastapi_application() -> FastAPI:
    """
    Constructs and configures the FastAPI application.
    Called once at startup — returns a fully configured app instance.
    """
    fastapi_application = FastAPI(
        title="FluxIdeas Agent Pipeline",
        description=(
            "Internal FastAPI service that runs the 4-agent market research pipeline. "
            "Not publicly accessible — only called by the Node.js backend."
        ),
        version="1.0.0",
        lifespan=application_lifespan,
        # Disable docs in production — this service is internal only
        docs_url="/docs" if os.environ.get("NODE_ENV") != "production" else None,
        redoc_url=None,
    )

    # The only origin that should ever call this service is the Node.js backend.
    # On Railway, services communicate over private networking, so CORS is a secondary
    # safeguard — the X-Internal-Key header is the real security boundary.
    nodejs_backend_origin = os.environ.get("NODEJS_BACKEND_ORIGIN_URL", "")
    allowed_cors_origins = [nodejs_backend_origin] if nodejs_backend_origin else ["*"]

    fastapi_application.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    fastapi_application.include_router(health_check_api_router)
    fastapi_application.include_router(pipeline_execution_api_router)

    return fastapi_application


app = create_fastapi_application()
