from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from .trade import MarketPosition


class WalletConfig(BaseModel):
    address: str
    allocation_pct: float = 0.05
    max_notional_per_trade: float = 250.0
    stop_loss_pct: float = 0.25
    enabled: bool = True


class WalletMirrorState(BaseModel):
    wallet: WalletConfig
    open_positions: Dict[str, MarketPosition] = Field(default_factory=dict)
    last_sync_at: Optional[datetime] = None


class WalletMirrorSummary(BaseModel):
    wallets: List[WalletMirrorState]
    total_positions: int
