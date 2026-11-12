from pathlib import Path
from uuid import uuid4

import boto3
from botocore.config import Config
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_INVOICE_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_INVOICE_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4"),
    )


async def upload_invoice_file(fundraiser_id: str, file: UploadFile) -> str:
    content_type = file.content_type or ""
    if content_type not in ALLOWED_INVOICE_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unsupported file type. Allowed formats: PDF, JPEG, PNG, WEBP",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Uploaded file is empty",
        )
    if len(content) > MAX_INVOICE_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="File size exceeds 10 MB limit",
        )

    ext = ALLOWED_INVOICE_CONTENT_TYPES[content_type]
    safe_stem = Path(file.filename or "invoice").stem[:40]
    object_key = f"invoices/{fundraiser_id}/{uuid4()}_{safe_stem}{ext}"

    client = get_s3_client()
    client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=object_key,
        Body=content,
        ContentType=content_type,
    )

    base_url = settings.S3_PUBLIC_BASE_URL.rstrip("/")
    return f"{base_url}/{settings.S3_BUCKET_NAME}/{object_key}"
