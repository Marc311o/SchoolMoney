from pathlib import Path
from uuid import UUID, uuid4

import boto3
from botocore.client import BaseClient
from botocore.config import Config
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_INVOICE_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_INVOICE_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
PRESIGNED_URL_EXPIRES_SECONDS = 604800  # 7 dni (maksimum dla S3 v4)


def get_s3_client() -> BaseClient:
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def get_public_s3_client() -> BaseClient:
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_PUBLIC_BASE_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        region_name=settings.S3_REGION,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


async def upload_invoice_file(fundraiser_id: UUID, file: UploadFile) -> str:
    if file.content_type not in ALLOWED_INVOICE_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unsupported file type. Allowed formats: PDF, JPG, PNG, WEBP.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Uploaded file is empty.",
        )

    if len(content) > MAX_INVOICE_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="File size exceeds the 10 MB limit.",
        )

    safe_filename = Path(file.filename or "invoice").name
    object_key = f"invoices/{fundraiser_id}/{uuid4()}_{safe_filename}"

    client = get_s3_client()
    client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=object_key,
        Body=content,
        ContentType=file.content_type,
    )

    public_client = get_public_s3_client()
    return public_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": object_key},
        ExpiresIn=PRESIGNED_URL_EXPIRES_SECONDS,
    )
