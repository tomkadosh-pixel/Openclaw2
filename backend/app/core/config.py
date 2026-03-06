from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the backend worker + API."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "local"
    log_level: str = "INFO"

    # Polymarket auth
    polymarket_magic_refresh_url: str = "https://wallet.magic.link/sdk/session"
    polymarket_graphql_url: str = "https://gamma-api.polymarket.com/graphql"
    polymarket_rest_url: str = "https://gamma-api.polymarket.com"
    polymarket_session_token: Optional[str] = None

    # Copy-trading parameters
    default_wallet_allocation_pct: float = 0.05
    max_parallel_positions: int = 20
    max_notional_per_market: float = 250.0
    tracked_wallets: List[str] = []
    use_mock_data: bool = True

    # Scheduler
    poll_interval_seconds: int = 20
    retry_backoff_seconds: int = 5


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
