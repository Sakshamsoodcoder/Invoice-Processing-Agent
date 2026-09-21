import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger("invoice_ai.db")

def get_engine():
    db_url = settings.DATABASE_URL
    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    try:
        engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
        # Test connection immediately
        with engine.connect() as conn:
            pass
        db_target = db_url.split("@")[-1] if "@" in db_url else db_url
        logger.info(f"Connected successfully to primary database: {db_target}")
        return engine
    except Exception as e:
        if db_url.startswith("postgresql"):
            logger.error(f"PostgreSQL connection failed: {e}", exc_info=True)
            if settings.ENVIRONMENT == "production":
                raise RuntimeError(f"Critical: Failed to connect to PostgreSQL database in production environment: {e}") from e
        
        logger.warning(f"Could not connect to {db_url}: {e}. Initiating local SQLite engine fallback for development.")
        sqlite_fallback = "sqlite:///./invoice_ai.db"
        return create_engine(sqlite_fallback, connect_args={"check_same_thread": False})

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
