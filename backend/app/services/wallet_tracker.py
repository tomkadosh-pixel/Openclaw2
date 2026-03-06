from __future__ import annotations

from datetime import datetime
from typing import List

from loguru import logger

from app.core.config import get_settings
from app.models.trade import MarketPosition, OrderSide
from app.models.wallet import WalletConfig, WalletMirrorState, WalletMirrorSummary
from app.services.polymarket_client import PolymarketClient
from state.store import WalletStateStore, state_store


class WalletTracker:
    def __init__(
        self,
        client: PolymarketClient | None = None,
        store: WalletStateStore | None = None,
    ) -> None:
        self.settings = get_settings()
        self.client = client or PolymarketClient()
        self.store = store or state_store

    def _ensure_wallet(self, wallet: WalletConfig) -> WalletMirrorState:
        state = self.store.get(wallet.address)
        if not state:
            state = WalletMirrorState(wallet=wallet)
            self.store.upsert(state)
        return state

    async def sync_wallet(self, wallet: WalletConfig) -> List[MarketPosition]:
        logger.info("Syncing wallet %s", wallet.address)
        state = self._ensure_wallet(wallet)
        raw_positions = await self.client.fetch_wallet_positions(wallet.address)
        positions: List[MarketPosition] = []
        for pos in raw_positions:
            try:
                positions.append(
                    MarketPosition(
                        market_id=pos["marketId"],
                        outcome_id=pos["outcomeId"],
                        price=float(pos["price"]),
                        size=float(pos["size"]),
                        side=OrderSide(pos["side"].lower()),
                        opened_at=datetime.fromisoformat(pos["createdAt"].replace("Z", "+00:00")),
                        source_wallet=wallet.address,
                    )
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to parse position for %s: %s", wallet.address, exc)
        state.open_positions = {pos.market_id: pos for pos in positions}
        state.last_sync_at = datetime.utcnow()
        return positions

    async def summary(self) -> WalletMirrorSummary:
        return self.store.summary()
