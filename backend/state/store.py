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
        return WalletMirrorSummary(
            wallets=list(self._states.values()),
            total_positions=sum(len(state.open_positions) for state in self._states.values()),
        )


state_store = WalletStateStore()
