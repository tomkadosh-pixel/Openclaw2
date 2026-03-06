from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from .trade import MarketPosition


class WalletConfig(BaseModel):
    address: str
    copy_ratio: float = 0.5  # portion of source trade size
    allocation_pct: float = 0.05
    max_notional_per_trade: float = 250.0
    stop_loss_pct: float = 0.25
    daily_loss_cap: float = 200.0
    description: str | None = None
    enabled: bool = True


class WalletMirrorState(BaseModel):
    wallet: WalletConfig
    open_positions: Dict[str, MarketPosition] = Field(default_factory=dict)
    realized_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    total_trades: int = 0
    profitable_trades: int = 0
    losing_trades: int = 0
    last_sync_at: Optional[datetime] = None


class WalletMirrorSummary(BaseModel):
    wallets: List[WalletMirrorState]
    total_positions: int
    realized_pnl: float
    unrealized_pnl: float
    total_trades: int
    profitable_trades: int
    losing_trades: int
