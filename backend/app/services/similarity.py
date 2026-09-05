from math import sqrt
from statistics import mean, median

from app.schemas.memory import HistoricalEvent, MarketMemoryResponse, OutcomeAggregate, SimilarHistoricalMatch
from app.schemas.fingerprint import FingerprintResponse
from app.services.fingerprint import FEATURE_NAMES


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    size = min(len(left), len(right))
    left_vector = left[:size]
    right_vector = right[:size]
    left_norm = sqrt(sum(value * value for value in left_vector))
    right_norm = sqrt(sum(value * value for value in right_vector))
    if not left_norm or not right_norm:
        return 0.0
    return round(max(0.0, min(1.0, sum(a * b for a, b in zip(left_vector, right_vector)) / (left_norm * right_norm))), 4)


def _matching_features(current: FingerprintResponse, event: HistoricalEvent) -> list[str]:
    differences = [(abs(current.features.get(name, 0) - event.features.get(name, 0)), name) for name in FEATURE_NAMES]
    differences.sort(key=lambda item: item[0])
    return [name for _, name in differences[:3]]


def find_top_matches(current: FingerprintResponse, events: list[HistoricalEvent], limit: int = 5) -> list[SimilarHistoricalMatch]:
    ranked = sorted(
        ((event, _cosine_similarity(current.vector, event.vector)) for event in events),
        key=lambda item: item[1],
        reverse=True,
    )[:limit]
    return [SimilarHistoricalMatch(
        event_date=event.event_date,
        similarity=similarity,
        matching_features=_matching_features(current, event),
        future_return_1d=event.future_return_1d,
        future_return_3d=event.future_return_3d,
        future_return_5d=event.future_return_5d,
        source=event.source,
        is_demo_data=event.is_demo_data,
    ) for event, similarity in ranked]


def _aggregate(values: list[float]) -> OutcomeAggregate:
    return OutcomeAggregate(
        median_return=round(median(values), 4),
        mean_return=round(mean(values), 4),
        positive_frequency=round(sum(value > 0 for value in values) / len(values), 4),
        sample_size=len(values),
    )


def build_market_memory(current: FingerprintResponse, events: list[HistoricalEvent]) -> MarketMemoryResponse:
    matches = find_top_matches(current, events)
    outcomes = {
        "1d": _aggregate([match.future_return_1d for match in matches]),
        "3d": _aggregate([match.future_return_3d for match in matches]),
        "5d": _aggregate([match.future_return_5d for match in matches]),
    }
    return MarketMemoryResponse(
        symbol=current.symbol,
        current_features=current.features,
        current_vector=current.vector,
        matches=matches,
        outcomes=outcomes,
        data_source="demo historical events" if any(match.is_demo_data for match in matches) else "historical events",
        is_demo_data=current.is_demo_data or any(match.is_demo_data for match in matches),
        methodology={
            "similarity": "cosine similarity over the normalized fingerprint vector",
            "matching_features": "three smallest absolute feature differences",
            "future_outcomes": "stored separately on historical events and excluded from similarity inputs",
            "sample_size": len(matches),
        },
    )
