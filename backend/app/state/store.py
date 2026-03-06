from __future__ import annotations

from typing import Dict

from app.models.wallet import WalletMirrorState, WalletMirrorSummary


class WalletStateStore:
    def __init__(self) -> None:
        self._states: Dict[str, WalletMirrorState] = {}

    def upsert(self, state: WalletMirrorState) -> None:
        self._states[state.wallet.address] = state

    def get(self, address: str) -> WalletMirrorState | None:
        return self._states.get(address)

    def summary(self) -> WalletMirrorSummary:
        wallets = list(self._states.values())
        return WalletMirrorSummary(
            wallets=wallets,
            total_positions=sum(len(state.open_positions) for state in wallets),
            realized_pnl=sum(state.realized_pnl for state in wallets),
            unrealized_pnl=sum(state.unrealized_pnl for state in wallets),
            total_trades=sum(state.total_trades for state in wallets),
            profitable_trades=sum(state.profitable_trades for state in wallets),
            losing_trades=sum(state.losing_trades for state in wallets),
        )


state_store = WalletStateStore()
