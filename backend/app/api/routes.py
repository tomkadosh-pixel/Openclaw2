from fastapi import APIRouter

from app.services.wallet_tracker import WalletTracker
from app.state.logs import log_store

router = APIRouter()
tracker = WalletTracker()


@router.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/summary")
async def summary() -> dict:
    snapshot = await tracker.summary()
    return snapshot.model_dump()


@router.get("/logs")
async def logs(limit: int = 40) -> list[dict]:
    return [
        {
            "level": entry.level,
            "message": entry.message,
            "context": entry.context,
            "timestamp": entry.timestamp.isoformat(),
        }
        for entry in log_store.list(limit=limit)
    ]
