from pydantic_settings import BaseSettings


class Settings(BaseSettings):

    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173"
    WHISPER_MODEL: str = "base"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"

    UPLOAD_DIR: str = "uploads"
    TAILLE_MAX_FICHIER_MO: int = 200

    PUBLIC_CERTIFICATE_URL: str = "http://localhost:5173/certificats"
    
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origins(self) -> list[str]:
        """Liste d'origines autorisées, configurable sans modifier le code."""
        return [
            origine.strip().rstrip("/")
            for origine in self.CORS_ORIGINS.split(",")
            if origine.strip()
        ]

    class Config:
        env_file = ".env"


settings = Settings()
