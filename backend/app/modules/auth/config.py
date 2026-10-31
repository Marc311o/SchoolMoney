from pydantic_settings import BaseSettings


class AuthSettings(BaseSettings):
    JWT_SECRET_KEY: str = "insecure-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7


settings = AuthSettings()
