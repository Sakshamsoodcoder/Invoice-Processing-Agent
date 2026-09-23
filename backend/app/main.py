import os
import sys
from pathlib import Path
import logging

# Ensure backend directory is in sys.path
backend_root = str(Path(__file__).resolve().parent.parent)
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import User, Invoice, InvoiceItem, InvoiceIssue
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.invoices import router as invoices_router
from app.api.analytics import router as analytics_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("invoice_ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully.")
    
    # Ensure local upload directory exists
    os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)
    
    logger.info("InvoiceAI Backend ready.")
    logger.info(f"Mode: {'Live Azure Services' if (settings.is_azure_doc_intel_configured and settings.is_azure_openai_configured) else 'Development / Mock Mode'}")
    yield
    # Shutdown
    logger.info("Shutting down InvoiceAI Backend.")

app = FastAPI(
    title="InvoiceAI – Intelligent Invoice Processing Assistant API",
    description="Production-grade AI invoice processing, validation, and analytics engine powered by Azure Document Intelligence and Azure OpenAI.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
origins = list(settings.cors_origins_list)
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://invoice-processing-agent-inky.vercel.app",
]
for default_orig in default_origins:
    if default_orig not in origins:
        origins.append(default_orig)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads for static serving
uploads_dir = os.path.abspath(settings.LOCAL_STORAGE_DIR)
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(invoices_router)
app.include_router(analytics_router)

@app.get("/")
def root():
    return {
        "message": "Welcome to InvoiceAI API",
        "docs": "/docs",
        "health": "/health",
        "mode": "Live Production" if settings.is_azure_doc_intel_configured else "Development / Mock Mode"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run("app.main:app", host=settings.HOST, port=port, reload=(settings.ENVIRONMENT == "development"))

