from datetime import datetime
from typing import Any

from app.schemas.changes import MeaningfulChange
from app.schemas.fingerprint import FingerprintResponse
from app.schemas.relationships import RelationshipResponse


FEATURE_WEIGHTS = {
    "price_return": 0.30,
    "volume_anomaly": 0.25,
    "volatility": 0.15,
    "benchmark_relative_strength": 0.15,
    "sector_relative_strength": 0.15,
}


def _bounded(value: float) -> float:
    return round(max(0.0, min(1.0, value)), 4)


def score_fingerprint_change(previous: FingerprintResponse, current: FingerprintResponse, detected_at: datetime, relationships: list[RelationshipResponse] | None = None) -> MeaningfulChange | None:
    feature_deltas = {
        name: round(abs(current.features.get(name, 0) - previous.features.get(name, 0)), 4)
        for name in FEATURE_WEIGHTS
    }
    normalized_signals = {
        name: _bounded(delta * 2.5)
        for name, delta in feature_deltas.items()
    }
    weighted_score = sum(normalized_signals[name] * weight for name, weight in FEATURE_WEIGHTS.items())
    relationship_signal = max((abs(item.correlation_change) for item in relationships or []), default=0.0)
    relationship_score = _bounded(relationship_signal)
    combined_score = _bounded(weighted_score * 0.85 + relationship_score * 0.15)
    threshold = 0.35
    if combined_score < threshold:
        return None

    strongest = sorted(normalized_signals.items(), key=lambda item: item[1], reverse=True)
    evidence = [name for name, value in strongest if value >= 0.25][:3]
    if relationship_score >= 0.35:
        evidence.append("relationship_change")
    change_type = "meaningful market change"
    if normalized_signals["volume_anomaly"] >= 0.55 and normalized_signals["price_return"] >= 0.45:
        change_type = "price and volume anomaly"
    elif relationship_score >= 0.55:
        change_type = "relationship anomaly"
    elif normalized_signals["benchmark_relative_strength"] >= 0.45 or normalized_signals["sector_relative_strength"] >= 0.45:
        change_type = "relative-strength change"

    confidence = _bounded(0.55 + combined_score * 0.35 - (0.15 if current.is_stale else 0))
    explanation = f"{current.symbol} changed meaningfully relative to its previous check, supported by {', '.join(evidence) or 'multiple contextual signals'}."
    return MeaningfulChange(
        symbol=current.symbol,
        change_type=change_type,
        score=round(combined_score, 4),
        confidence=round(confidence, 4),
        explanation=explanation,
        signals={
            "feature_deltas": feature_deltas,
            "normalized_signals": normalized_signals,
            "relationship_signal": round(relationship_signal, 4),
            "threshold": threshold,
            "evidence": evidence,
            "is_stale": current.is_stale,
            "data_source": current.data_source,
        },
        detected_at=detected_at,
    )
