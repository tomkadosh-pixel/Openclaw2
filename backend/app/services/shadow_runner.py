import asyncio

from loguru import logger

from app.core.config import get_settings
from app.models.wallet import WalletConfig
from app.services.copy_trader import CopyTrader
from app.services.wallet_tracker import WalletTracker


class ShadowRunner:
    """Periodically mirrors wallets in shadow mode (log-only)."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.tracker = WalletTracker()
        self.mirror = CopyTrader()
        self._stop = asyncio.Event()

    async def run(self) -> None:
        logger.info("Starting shadow runner loop")
        while not self._stop.is_set():
            await self._sync_all()
            await asyncio.sleep(self.settings.poll_interval_seconds)

    async def _sync_all(self) -> None:
        wallets = [
            WalletConfig(address=w, allocation_pct=self.settings.default_wallet_allocation_pct)
            for w in self.settings.tracked_wallets
        ]
        for wallet in wallets:
            positions = await self.tracker.sync_wallet(wallet)
            instructions = self.mirror.build_instructions(wallet, positions)
            for instruction in instructions:
                logger.info(
                    "SHADOW | %s -> %s | size=%.4f",
                    instruction.position.market_id,
                    instruction.target_wallet,
                    instruction.position.size * instruction.allocation_multiplier,
                )

    async def stop(self) -> None:
        self._stop.set()
