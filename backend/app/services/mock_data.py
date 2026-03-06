from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Any, Dict, List

MOCK_MARKETS = [
    "0xmarket0001",
    "0xmarket0002",
    "0xmarket0003",
    "0xmarket0004",
]

OUTCOMES = ["YES", "NO"]


def mock_positions(wallet: str) -> List[Dict[str, Any]]:
    rng = random.Random(wallet)
    positions: List[Dict[str, Any]] = []
    for market in MOCK_MARKETS:
        if rng.random() < 0.4:
            continue
        outcome = rng.choice(OUTCOMES)
        size = round(rng.uniform(50, 200), 2)
        price = round(rng.uniform(0.3, 0.7), 2)
        side = "buy" if outcome == "YES" else "sell"
        created_at = datetime.utcnow() - timedelta(minutes=rng.randint(1, 90))
        positions.append(
            {
                "marketId": market,
                "outcomeId": outcome,
                "price": price,
                "size": size,
                "side": side,
                "createdAt": created_at.isoformat() + "Z",
            }
        )
    return positions
