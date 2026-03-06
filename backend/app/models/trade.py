from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


class MarketPosition(BaseModel):
    market_id: str
    outcome_id: str
    price: float
    size: float
    side: OrderSide
    opened_at: datetime = Field(default_factory=datetime.utcnow)
    source_wallet: Optional[str] = None


class MirrorInstruction(BaseModel):
    target_wallet: str
    position: MarketPosition
    allocation_multiplier: float = 1.0
    max_notional: Optional[float] = None
    stop_loss_pct: Optional[float] = None
