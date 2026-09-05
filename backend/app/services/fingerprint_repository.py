from app.config import settings
from app.schemas.fingerprint import FingerprintResponse, MarketDataResponse
from app.services.database import get_supabase_service_client


async def persist_fingerprint(fingerprint: FingerprintResponse, market_data: MarketDataResponse) -> None:
    client = get_supabase_service_client()
    latest_point = market_data.points[-1]
    previous_point = market_data.points[-2] if len(market_data.points) > 1 else latest_point
    snapshot = client.table("market_snapshots").insert({
        "symbol": market_data.symbol,
        "price": latest_point.price,
        "previous_close": previous_point.price,
        "volume": int(latest_point.volume),
        "observed_at": market_data.timestamp.isoformat(),
        "source": market_data.source,
        "is_stale": market_data.is_stale,
        "delay_seconds": market_data.delay_seconds,
        "metadata": {"is_demo_data": market_data.is_demo_data},
    }).execute()
    snapshot_id = snapshot.data[0]["id"]
    client.table("market_fingerprints").insert({
        "symbol": fingerprint.symbol,
        "snapshot_id": snapshot_id,
        "feature_version": settings.fingerprint_feature_version,
        "features": fingerprint.features,
        "vector": fingerprint.vector,
        "calculated_at": fingerprint.timestamp.isoformat(),
        "data_quality": {
            "source": fingerprint.data_source,
            "is_demo_data": fingerprint.is_demo_data,
            "is_stale": fingerprint.is_stale,
            "delay_seconds": fingerprint.delay_seconds,
        },
    }).execute()
