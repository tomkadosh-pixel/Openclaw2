from __future__ import annotations

from datetime import datetime
import random
from typing import List

from loguru import logger

from app.core.config import get_settings
from app.models.trade import MarketPosition, OrderSide
from app.models.wallet import WalletConfig, WalletMirrorState, WalletMirrorSummary
from app.services.mock_data import mock_positions
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
        raw_positions = await self._load_positions(wallet)
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
        if self.settings.use_mock_data:
            self._apply_mock_metrics(state)
        return positions

    async def _load_positions(self, wallet: WalletConfig) -> List[dict]:
        if self.settings.use_mock_data:
            return mock_positions(wallet.address)
        try:
            return await self.client.fetch_wallet_positions(wallet.address)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Falling back to mock data for %s (%s)", wallet.address, exc)
            return mock_positions(wallet.address)

    async def summary(self) -> WalletMirrorSummary:
        return self.store.summary()

    def _apply_mock_metrics(self, state: WalletMirrorState) -> None:
        rng = random.Random(state.wallet.address)
        total_trades = rng.randint(5, 25)
        profitable = int(total_trades * rng.uniform(0.4, 0.7))
        losing = total_trades - profitable
        state.total_trades = total_trades
        state.profitable_trades = profitable
        state.losing_trades = losing
        state.realized_pnl = round(rng.uniform(-150, 350), 2)
        state.unrealized_pnl = round(rng.uniform(-80, 180), 2)
