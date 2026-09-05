from fastapi import APIRouter, HTTPException

from app.providers.demo import DemoMarketDataProvider
from app.providers.factory import get_market_data_provider
from app.schemas.fingerprint import FingerprintResponse
from app.services.fingerprint import build_fingerprint
from app.services.fingerprint_repository import persist_fingerprint

router = APIRouter(prefix="/api", tags=["fingerprints"])


@router.get("/fingerprint/{symbol}", response_model=FingerprintResponse)
async def get_fingerprint(symbol: str) -> FingerprintResponse:
    normalized_symbol = symbol.strip().upper()
    if not normalized_symbol or len(normalized_symbol) > 20:
        raise HTTPException(status_code=400, detail="A valid symbol is required")

    provider = get_market_data_provider()
    fallback_reason: str | None = None
    try:
        market_data = await provider.get_market_data(normalized_symbol)
    except RuntimeError as error:
        if provider.__class__ is DemoMarketDataProvider:
            raise HTTPException(status_code=502, detail=str(error)) from error
        fallback_reason = str(error)
        market_data = await DemoMarketDataProvider().get_market_data(normalized_symbol)

    fingerprint = build_fingerprint(market_data)
    if fallback_reason:
        fingerprint.metadata["live_provider_fallback"] = fallback_reason

    try:
        await persist_fingerprint(fingerprint, market_data)
        fingerprint.persisted = True
    except RuntimeError as error:
        fingerprint.persistence_warning = str(error)
    except Exception as error:
        fingerprint.persistence_warning = f"Fingerprint could not be persisted: {error}"

    return fingerprint
