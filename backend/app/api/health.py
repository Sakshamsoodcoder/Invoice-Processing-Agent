import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db, engine
from app.core.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    def sanitize_host(url: str, default: str = "mock://local") -> str:
        if not url:
            return default
        try:
            return url.split("//")[-1].split("/")[0]
        except Exception:
            return "configured"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "app": "InvoiceAI – Intelligent Invoice Processing Assistant",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": db_status,
            "type": engine.dialect.name
        },
        "services": {
            "azure_document_intelligence": {
                "configured": settings.is_azure_doc_intel_configured,
                "mode": "Live Production" if settings.is_azure_doc_intel_configured else "Development / Mock Mode",
                "endpoint_host": sanitize_host(settings.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT)
            },
            "azure_openai": {
                "configured": settings.is_azure_openai_configured,
                "mode": "Live Production" if settings.is_azure_openai_configured else "Development / Mock Mode",
                "deployment": settings.AZURE_OPENAI_DEPLOYMENT,
                "endpoint_host": sanitize_host(settings.AZURE_OPENAI_ENDPOINT)
            },
            "azure_blob_storage": {
                "configured": settings.is_azure_storage_configured,
                "mode": "Azure Blob Storage" if settings.is_azure_storage_configured else "Local Storage Fallback",
                "container": settings.AZURE_STORAGE_CONTAINER,
                "local_dir": os.path.abspath(settings.LOCAL_STORAGE_DIR)
            }
        }
    }
