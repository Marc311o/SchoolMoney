from pydantic import EmailStr, Field, HttpUrl, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings


class AuthSettings(BaseSettings):
    JWT_SECRET_KEY: str = "insecure-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    PASSWORD_RESET_EXPIRE_MINUTES: int = Field(default=30, ge=1, le=60)
    PASSWORD_RESET_URL: HttpUrl = "http://localhost:8000/api/auth/password-reset"

    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = Field(default=465, ge=1, le=65535)
    SMTP_FROM: EmailStr = "no-reply@example.com"
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: SecretStr = SecretStr("")
    SMTP_USE_TLS: bool = False
    SMTP_USE_SSL: bool = True

    @field_validator("PASSWORD_RESET_URL")
    @classmethod
    def validate_reset_url(cls, value: HttpUrl) -> HttpUrl:
        if value.query or value.fragment or value.username or value.password:
            raise ValueError("PASSWORD_RESET_URL must not contain credentials, query or fragment")

        local_hosts = {"localhost", "127.0.0.1", "[::1]", "::1"}

        if value.scheme != "https" and value.host not in local_hosts:
            raise ValueError("Public password reset URLs must use HTTPS")

        if not (value.path or "").rstrip("/").endswith("/api/auth/password-reset"):
            raise ValueError("PASSWORD_RESET_URL must point to /api/auth/password-reset")

        return HttpUrl(str(value).rstrip("/"))

    @model_validator(mode="after")
    def validate_smtp_transport(self) -> "AuthSettings":
        if self.SMTP_USE_TLS and self.SMTP_USE_SSL:
            raise ValueError("Choose STARTTLS or SSL, not both")
        return self


settings = AuthSettings()
