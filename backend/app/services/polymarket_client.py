from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx
from loguru import logger

from app.core.config import get_settings


class PolymarketClient:
    """Thin wrapper around Polymarket APIs (GraphQL + REST)."""

    def __init__(self, session_token: Optional[str] = None) -> None:
        self.settings = get_settings()
        self.session_token = session_token or self.settings.polymarket_session_token
        self._http = httpx.AsyncClient(base_url=self.settings.polymarket_rest_url, timeout=10.0)

    async def _headers(self) -> Dict[str, str]:
        headers = {
            "accept": "application/json",
            "user-agent": "openclaw-copybot/0.1",
        }
        if self.session_token:
            headers["authorization"] = f"Bearer {self.session_token}"
        return headers

    async def fetch_wallet_positions(self, wallet: str) -> List[Dict[str, Any]]:
        endpoint = f"/wallets/{wallet}/positions"
        resp = await self._http.get(endpoint, headers=await self._headers())
        resp.raise_for_status()
        data = resp.json()
        logger.debug("Fetched %s positions for %s", len(data), wallet)
        return data

    async def place_order(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        endpoint = "/orders"
        resp = await self._http.post(endpoint, json=payload, headers=await self._headers())
        resp.raise_for_status()
        return resp.json()

    async def close(self) -> None:
        await self._http.aclose()
