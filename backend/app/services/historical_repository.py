import hashlib
from datetime import date, timedelta

from app.config import settings
from app.schemas.memory import HistoricalEvent
from app.services.database import get_supabase_service_client
from app.services.fingerprint import FEATURE_NAMES


def build_demo_events(symbol: str, current_vector: list[float]) -> list[HistoricalEvent]:
    seed = int(hashlib.sha256(symbol.encode()).hexdigest()[:8], 16)
    events: list[HistoricalEvent] = []
    for index in range(12):
        offsets = [(((seed >> ((index + feature_index) % 16)) & 15) - 7) / 100 for feature_index in range(len(FEATURE_NAMES))]
        vector = [round(max(0.01, min(0.99, value + offsets[feature_index])), 4) for feature_index, value in enumerate(current_vector)]
        features = dict(zip(FEATURE_NAMES, vector))
        event_seed = seed + index * 97
        events.append(HistoricalEvent(
            symbol=symbol,
            event_date=date(2024, 7, 18) - timedelta(days=index * 19),
            features=features,
            vector=vector,
            future_return_1d=round(((event_seed % 31) - 15) / 1000, 4),
            future_return_3d=round(((event_seed % 51) - 20) / 1000, 4),
            future_return_5d=round(((event_seed % 71) - 30) / 1000, 4),
            source="demo historical events",
            is_demo_data=True,
        ))
    return events


def load_historical_events(symbol: str, current_vector: list[float]) -> list[HistoricalEvent]:
    try:
        client = get_supabase_service_client()
        response = client.table("historical_events").select("*").eq("symbol", symbol).order("event_date", desc=True).limit(100).execute()
        if response.data:
            return [_record_to_event(record) for record in response.data]
        demo_events = build_demo_events(symbol, current_vector)
        client.table("historical_events").insert([_event_to_record(event) for event in demo_events]).execute()
        return demo_events
    except RuntimeError:
        return build_demo_events(symbol, current_vector)


def _record_to_event(record: dict) -> HistoricalEvent:
    stored_fingerprint = record.get("fingerprint") or {}
    features = stored_fingerprint.get("features", stored_fingerprint)
    vector = stored_fingerprint.get("vector") or [features.get(name, 0) for name in FEATURE_NAMES]
    return HistoricalEvent(
        symbol=record["symbol"],
        event_date=record["event_date"],
        features=features,
        vector=vector,
        future_return_1d=float(record["future_return_1d"]),
        future_return_3d=float(record["future_return_3d"]),
        future_return_5d=float(record["future_return_5d"]),
        source=record.get("source", "historical events"),
        is_demo_data=record.get("source") == "demo historical events",
    )


def _event_to_record(event: HistoricalEvent) -> dict:
    return {
        "symbol": event.symbol,
        "event_date": event.event_date.isoformat(),
        "feature_version": settings.fingerprint_feature_version,
        "fingerprint": {"features": event.features, "vector": event.vector},
        "future_return_1d": event.future_return_1d,
        "future_return_3d": event.future_return_3d,
        "future_return_5d": event.future_return_5d,
        "source": event.source,
    }
