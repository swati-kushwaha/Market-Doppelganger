from fastapi import APIRouter, HTTPException

from app.api.fingerprints import get_fingerprint
from app.schemas.memory import MarketMemoryResponse
from app.services.historical_repository import load_historical_events
from app.services.similarity import build_market_memory

router = APIRouter(prefix="/api", tags=["market-memory"])


@router.get("/market-memory/{symbol}", response_model=MarketMemoryResponse)
async def get_market_memory(symbol: str) -> MarketMemoryResponse:
    normalized_symbol = symbol.strip().upper()
    if not normalized_symbol or len(normalized_symbol) > 20:
        raise HTTPException(status_code=400, detail="A valid symbol is required")
    current = await get_fingerprint(normalized_symbol)
    events = load_historical_events(normalized_symbol, current.vector)
    return build_market_memory(current, events)
