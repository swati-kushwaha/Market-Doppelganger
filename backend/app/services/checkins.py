from datetime import datetime, timezone
from typing import Any

from supabase import Client

from app.config import settings
from app.providers.market import MarketDataProvider
from app.schemas.changes import CheckInResponse, MeaningfulChange
from app.schemas.fingerprint import FingerprintResponse, MarketDataResponse
from app.schemas.relationships import RelationshipResponse
from app.services.fingerprint import build_fingerprint
from app.services.meaningful_changes import score_fingerprint_change
from app.services.relationships import build_relationship, related_symbols


def _stored_fingerprint(record: dict[str, Any]) -> FingerprintResponse:
    quality = record.get("data_quality") or {}
    features = record.get("features") or {}
    vector = record.get("vector") or []
    return FingerprintResponse(
        symbol=record["symbol"],
        timestamp=record["calculated_at"],
        features=features,
        vector=vector,
        data_source=quality.get("source", "stored"),
        is_demo_data=bool(quality.get("is_demo_data", False)),
        is_stale=bool(quality.get("is_stale", False)),
        delay_seconds=int(quality.get("delay_seconds", 0)),
        persisted=True,
        metadata={"stored_fingerprint_id": record.get("id")},
    )


def _persist_market_state(client: Client, fingerprint: FingerprintResponse, market_data: MarketDataResponse) -> None:
    latest = market_data.points[-1]
    previous = market_data.points[-2] if len(market_data.points) > 1 else latest
    snapshot = client.table("market_snapshots").insert({
        "symbol": market_data.symbol,
        "price": latest.price,
        "previous_close": previous.price,
        "volume": int(latest.volume),
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


async def check_in_watchlist(client: Client, provider: MarketDataProvider, user_id: str, watchlist_id: str) -> CheckInResponse:
    watchlist_result = client.table("watchlists").select("id, user_id, watchlist_stocks(symbol, exchange)").eq("id", watchlist_id).eq("user_id", user_id).execute()
    if not watchlist_result.data:
        raise PermissionError("Watchlist was not found for this user")
    stocks = watchlist_result.data[0].get("watchlist_stocks") or []
    current_checked_at = datetime.now(timezone.utc)
    previous_result = client.table("user_visits").select("id, checked_at, snapshot_cutoff").eq("user_id", user_id).eq("watchlist_id", watchlist_id).order("checked_at", desc=True).limit(1).execute()
    previous_visit = previous_result.data[0] if previous_result.data else None

    current_fingerprints: dict[str, FingerprintResponse] = {}
    market_data_by_symbol: dict[str, MarketDataResponse] = {}
    for stock in stocks:
        symbol = stock["symbol"]
        market_data = await provider.get_market_data(symbol)
        fingerprint = build_fingerprint(market_data)
        _persist_market_state(client, fingerprint, market_data)
        current_fingerprints[symbol] = fingerprint
        market_data_by_symbol[symbol] = market_data

    snapshot_cutoff = max((fingerprint.timestamp for fingerprint in current_fingerprints.values()), default=current_checked_at)

    visit_result = client.table("user_visits").insert({
        "user_id": user_id,
        "watchlist_id": watchlist_id,
        "checked_at": current_checked_at.isoformat(),
        "snapshot_cutoff": snapshot_cutoff.isoformat(),
    }).execute()
    visit_id = visit_result.data[0]["id"]

    if not previous_visit:
        return CheckInResponse(
            visit_id=visit_id,
            watchlist_id=watchlist_id,
            first_visit=True,
            baseline_set=True,
            previous_checked_at=None,
            current_checked_at=current_checked_at,
            unchanged_symbols=[],
            meaningful_changes=[],
        )

    cutoff = previous_visit.get("snapshot_cutoff") or previous_visit["checked_at"]
    previous_result = client.table("market_fingerprints").select("*").in_("symbol", list(current_fingerprints)).lte("calculated_at", cutoff).order("calculated_at", desc=True).execute()
    previous_by_symbol: dict[str, FingerprintResponse] = {}
    for record in previous_result.data or []:
        if record["symbol"] not in previous_by_symbol:
            previous_by_symbol[record["symbol"]] = _stored_fingerprint(record)

    changes: list[MeaningfulChange] = []
    unchanged: list[str] = []
    for symbol, current in current_fingerprints.items():
        previous = previous_by_symbol.get(symbol)
        if not previous:
            unchanged.append(symbol)
            continue
        relationships: list[RelationshipResponse] = []
        current_data = market_data_by_symbol[symbol]
        for related_symbol in related_symbols(symbol):
            if related_symbol == symbol:
                continue
            related_data = await provider.get_market_data(related_symbol)
            relationships.append(build_relationship(symbol, related_symbol, current_data, related_data))
        change = score_fingerprint_change(previous, current, current_checked_at, relationships)
        if change:
            changes.append(change)
            client.table("detected_changes").insert({
                "user_id": user_id,
                "watchlist_id": watchlist_id,
                "symbol": change.symbol,
                "change_type": change.change_type,
                "score": change.score,
                "confidence": change.confidence,
                "explanation": change.explanation,
                "signals": change.signals,
                "detected_at": change.detected_at.isoformat(),
                "baseline_visit_id": previous_visit["id"],
            }).execute()
        else:
            unchanged.append(symbol)

    return CheckInResponse(
        visit_id=visit_id,
        watchlist_id=watchlist_id,
        first_visit=False,
        baseline_set=True,
        previous_checked_at=previous_visit["checked_at"],
        current_checked_at=current_checked_at,
        meaningful_changes=changes,
        unchanged_symbols=unchanged,
    )
