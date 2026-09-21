import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="development")
    PORT: int = Field(default=8000)
    HOST: str = Field(default="0.0.0.0")
    CORS_ORIGINS: str = Field(default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")

    # Security
    JWT_SECRET: str = Field(default="super_secret_jwt_key_invoice_ai_2026_change_in_production")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440)

    # Database
    DATABASE_URL: str = Field(default="sqlite:///./invoice_ai.db")

    # Azure Document Intelligence
    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: str = Field(default="")
    AZURE_DOCUMENT_INTELLIGENCE_KEY: str = Field(default="")

    # Microsoft Foundry / Azure OpenAI
    AZURE_OPENAI_ENDPOINT: str = Field(default="")
    AZURE_OPENAI_API_KEY: str = Field(default="")
    AZURE_OPENAI_DEPLOYMENT: str = Field(default="gpt-4o")
    AZURE_OPENAI_API_VERSION: str = Field(default="2024-02-15-preview")

    # Azure Blob Storage
    AZURE_STORAGE_CONNECTION_STRING: str = Field(default="")
    AZURE_STORAGE_CONTAINER: str = Field(default="invoices")
    LOCAL_STORAGE_DIR: str = Field(default="./uploads")

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_azure_doc_intel_configured(self) -> bool:
        return bool(self.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and self.AZURE_DOCUMENT_INTELLIGENCE_KEY)

    @property
    def is_azure_openai_configured(self) -> bool:
        return bool(self.AZURE_OPENAI_ENDPOINT and self.AZURE_OPENAI_API_KEY)

    @property
    def is_azure_storage_configured(self) -> bool:
        return bool(self.AZURE_STORAGE_CONNECTION_STRING)

settings = Settings()
