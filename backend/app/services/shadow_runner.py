import asyncio
import json
from pathlib import Path

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
        for wallet in self._wallet_configs():
            positions = await self.tracker.sync_wallet(wallet)
            instructions = self.mirror.build_instructions(wallet, positions)
            for instruction in instructions:
                logger.info(
                    "SHADOW | %s -> %s | size=%.4f",
                    instruction.position.market_id,
                    instruction.target_wallet,
                    instruction.position.size * instruction.allocation_multiplier,
                )

    def _wallet_configs(self) -> list[WalletConfig]:
        if self.settings.wallet_profiles:
            return [WalletConfig.model_validate(cfg) for cfg in self.settings.wallet_profiles]
        file_wallets = self._load_wallets_from_file()
        if file_wallets:
            return file_wallets
        return [
            WalletConfig(
                address=w,
                allocation_pct=self.settings.default_wallet_allocation_pct,
            )
            for w in self.settings.tracked_wallets
        ]

    def _load_wallets_from_file(self) -> list[WalletConfig]:
        raw_path = self.settings.wallets_file
        path = Path(raw_path) if raw_path else Path(__file__).resolve().parents[2] / "wallets.json"
        if not path.exists():
            return []
        with path.open("r", encoding="utf-8") as fp:
            data = json.load(fp)
        return [WalletConfig.model_validate(item) for item in data]

    async def stop(self) -> None:
        self._stop.set()
