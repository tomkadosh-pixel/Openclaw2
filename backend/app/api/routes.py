from fastapi import APIRouter

from app.services.wallet_tracker import WalletTracker

router = APIRouter()
tracker = WalletTracker()


@router.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/summary")
async def summary() -> dict:
    snapshot = await tracker.summary()
    return snapshot.model_dump()
