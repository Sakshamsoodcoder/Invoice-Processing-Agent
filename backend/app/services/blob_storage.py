import os
import uuid
import logging
from typing import Tuple, Optional
from fastapi import UploadFile
from app.core.config import settings

logger = logging.getLogger("invoice_ai.services.blob_storage")

class BlobStorageService:
    def __init__(self):
        self.is_azure = settings.is_azure_storage_configured
        self.container_name = settings.AZURE_STORAGE_CONTAINER
        self.local_dir = os.path.abspath(settings.LOCAL_STORAGE_DIR)
        os.makedirs(self.local_dir, exist_ok=True)

        if not self.is_azure:
            logger.info(f"Local storage active. Files stored in: {self.local_dir}")
        else:
            try:
                from azure.storage.blob import BlobServiceClient
                self.blob_service_client = BlobServiceClient.from_connection_string(
                    settings.AZURE_STORAGE_CONNECTION_STRING
                )
                self.container_client = self.blob_service_client.get_container_client(self.container_name)
                if not self.container_client.exists():
                    self.container_client.create_container()
                logger.info(f"Connected to Azure Blob Storage container: {self.container_name}")
            except Exception as e:
                logger.error(f"Failed to connect to Azure Blob Storage: {e}. Falling back to local storage.", exc_info=True)
                self.is_azure = False

    async def upload_file(self, file: UploadFile) -> Tuple[str, str, int, str]:
        """
        Uploads file to Azure Blob Storage and keeps a local working copy.
        Returns: (file_url, unique_filename, file_size, local_path)
        """
        content = await file.read()
        file_size = len(content)
        await file.seek(0)

        ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"

        # 1. Save local working copy for immediate local extraction and cache
        local_path = os.path.join(self.local_dir, unique_filename)
        with open(local_path, "wb") as f:
            f.write(content)

        # 2. If Azure Blob Storage is active, upload to private container
        if self.is_azure:
            try:
                blob_client = self.container_client.get_blob_client(unique_filename)
                blob_client.upload_blob(
                    content,
                    overwrite=True,
                    content_type=file.content_type or "application/octet-stream"
                )
                logger.info(f"Uploaded {file.filename} ({file_size} bytes) to Azure Blob container '{self.container_name}' as {unique_filename}")
            except Exception as e:
                logger.error(f"Azure Blob upload failed: {e}. Stored locally.", exc_info=True)

        # File URL is served securely through the application proxy
        file_url = f"/api/invoices/files/{unique_filename}"
        return file_url, unique_filename, file_size, local_path

    def get_file_content(self, filename: str) -> Tuple[bytes, str]:
        """
        Retrieves file bytes and content-type. Checks local storage first, then Azure Blob Storage.
        """
        local_path = os.path.join(self.local_dir, filename)
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                content = f.read()
            ext = os.path.splitext(filename)[1].lower()
            content_type = "application/pdf" if ext == ".pdf" else "image/png" if ext == ".png" else "image/jpeg"
            return content, content_type

        # Check Azure Blob Storage
        if self.is_azure:
            try:
                blob_client = self.container_client.get_blob_client(filename)
                if blob_client.exists():
                    props = blob_client.get_blob_properties()
                    content = blob_client.download_blob().readall()
                    content_type = props.content_settings.content_type or "application/octet-stream"
                    return content, content_type
            except Exception as e:
                logger.error(f"Failed to download blob {filename} from Azure: {e}")

        raise FileNotFoundError(f"Invoice file '{filename}' could not be located in storage.")

    def get_file_path(self, filename: str) -> str:
        """Returns local path if file exists locally."""
        dest_path = os.path.join(self.local_dir, filename)
        if os.path.exists(dest_path):
            return dest_path
        raise FileNotFoundError(f"File {filename} not found in local working directory.")

    def delete_file(self, filename: str) -> bool:
        """Deletes file from both Azure Blob Storage and local disk."""
        deleted = False
        if self.is_azure:
            try:
                blob_client = self.container_client.get_blob_client(filename)
                if blob_client.exists():
                    blob_client.delete_blob()
                    deleted = True
                    logger.info(f"Deleted blob {filename} from Azure container '{self.container_name}'")
            except Exception as e:
                logger.warning(f"Could not delete Azure blob {filename}: {e}")

        local_path = os.path.join(self.local_dir, filename)
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
                deleted = True
                logger.info(f"Deleted local file {local_path}")
            except Exception as e:
                logger.warning(f"Could not delete local file {local_path}: {e}")

        return deleted

storage_service = BlobStorageService()
