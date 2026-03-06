from __future__ import annotations

from typing import Iterable, List

from loguru import logger

from app.core.config import get_settings
from app.models.trade import MarketPosition, MirrorInstruction
from app.models.wallet import WalletConfig
from app.services.polymarket_client import PolymarketClient


class CopyTrader:
    def __init__(self, client: PolymarketClient | None = None) -> None:
        self.settings = get_settings()
        self.client = client or PolymarketClient()

    def build_instructions(
        self,
        wallet_config: WalletConfig,
        mirrored_positions: Iterable[MarketPosition],
    ) -> List[MirrorInstruction]:
        instructions: List[MirrorInstruction] = []
        for position in mirrored_positions:
            allocation = wallet_config.allocation_pct
            instructions.append(
                MirrorInstruction(
                    target_wallet=wallet_config.address,
                    position=position,
                    allocation_multiplier=allocation,
                    max_notional=wallet_config.max_notional_per_trade,
                    stop_loss_pct=wallet_config.stop_loss_pct,
                )
            )
        logger.debug("Built %s instructions for %s", len(instructions), wallet_config.address)
        return instructions

    async def execute_instruction(self, instruction: MirrorInstruction) -> None:
        payload = {
            "marketId": instruction.position.market_id,
            "outcomeId": instruction.position.outcome_id,
            "price": instruction.position.price,
            "size": instruction.position.size * instruction.allocation_multiplier,
            "side": instruction.position.side.value,
        }
        await self.client.place_order(payload)
        logger.info("Mirrored trade on market %s for %s", instruction.position.market_id, instruction.target_wallet)
