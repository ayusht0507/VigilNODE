"""
Centralized application settings, loaded from environment variables / .env.
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Dynamically load auth environment settings from secure-auth-app server/.env
_server_env = Path(__file__).resolve().parents[3] / "secure-auth-app" / "server" / ".env"
if _server_env.exists():
    load_dotenv(dotenv_path=_server_env)


class Settings(BaseSettings):
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "changeme"

    spacy_model: str = "en_core_web_sm"
    whisper_model: str = "base"

    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:3000"
    auth_api_url: str = "http://localhost:5000"

    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
