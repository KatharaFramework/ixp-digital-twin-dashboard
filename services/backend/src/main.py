"""
IXP Digital Twin API - Main Application Entry Point

This module initializes and runs the FastAPI application for managing
IXP Digital Twin network scenarios and quarantine checks.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import register_routes
from operations import fetch_digital_twin

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI()

    # Configure CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register all routes
    register_routes(app)
    fetch_digital_twin()

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    logger.info("Starting IXP Digital Twin API server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
