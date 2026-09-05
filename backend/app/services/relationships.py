from statistics import mean

from app.schemas.fingerprint import MarketDataResponse
from app.schemas.relationships import RelationshipResponse

RELATED_SYMBOLS: dict[str, tuple[str, ...]] = {
    "RELIANCE": ("ONGC", "IOC", "BPCL", "NTPC"),
    "ONGC": ("RELIANCE", "IOC", "BPCL", "NTPC"),
    "IOC": ("RELIANCE", "ONGC", "BPCL", "NTPC"),
    "BPCL": ("RELIANCE", "ONGC", "IOC", "NTPC"),
    "NTPC": ("RELIANCE", "ONGC", "IOC", "POWERGRID"),
    "TCS": ("INFY", "HCLTECH", "WIPRO"),
    "INFY": ("TCS", "HCLTECH", "WIPRO"),
    "HDFCBANK": ("ICICIBANK", "AXISBANK", "SBIN"),
    "ICICIBANK": ("HDFCBANK", "AXISBANK", "SBIN"),
}


def related_symbols(symbol: str) -> tuple[str, ...]:
    return RELATED_SYMBOLS.get(symbol, ("RELIANCE", "TCS", "HDFCBANK", "INFY"))


def returns(prices: list[float]) -> list[float]:
    return [(current / previous) - 1 for previous, current in zip(prices, prices[1:]) if previous]


def correlation(left: list[float], right: list[float]) -> float:
    size = min(len(left), len(right))
    left = left[-size:]
    right = right[-size:]
    if len(left) < 3:
        return 0.0
    left_mean = mean(left)
    right_mean = mean(right)
    numerator = sum((left_value - left_mean) * (right_value - right_mean) for left_value, right_value in zip(left, right))
    left_deviation = sum((value - left_mean) ** 2 for value in left) ** 0.5
    right_deviation = sum((value - right_mean) ** 2 for value in right) ** 0.5
    if not left_deviation or not right_deviation:
        return 0.0
    return max(-1.0, min(1.0, numerator / (left_deviation * right_deviation)))


def classify_relationship(current: float, baseline: float) -> tuple[str, bool]:
    change = current - baseline
    if current >= 0.7 and baseline < 0.5:
        return "unusual synchronization", True
    if current <= -0.5 and baseline > 0:
        return "divergence", True
    if change >= 0.2:
        return "correlation increase", True
    if change <= -0.2:
        return "correlation decrease", True
    return "stable relationship", False


def build_relationship(symbol: str, related_symbol: str, current_data: MarketDataResponse, related_data: MarketDataResponse) -> RelationshipResponse:
    current_returns = returns([point.price for point in current_data.points])
    related_returns = returns([point.price for point in related_data.points])
    window = min(10, len(current_returns) // 3, len(related_returns) // 3)
    if window < 3:
        window = min(len(current_returns), len(related_returns))
    current_correlation = correlation(current_returns[-window:], related_returns[-window:])
    historical_correlation = correlation(current_returns[:-window], related_returns[:-window]) if len(current_returns) > window * 2 else correlation(current_returns, related_returns)
    change = current_correlation - historical_correlation
    relationship_type, significant = classify_relationship(current_correlation, historical_correlation)
    confidence = min(0.99, round(0.5 + abs(change) * 0.8 + min(window, 10) / 100, 4))
    return RelationshipResponse(
        related_symbol=related_symbol,
        correlation=round(current_correlation, 4),
        historical_correlation=round(historical_correlation, 4),
        correlation_change=round(change, 4),
        similarity=round((current_correlation + 1) / 2, 4),
        relationship_type=relationship_type,
        confidence=confidence,
        explanation=f"{symbol} and {related_symbol} have recently moved {'more closely together' if change >= 0 else 'less closely together'} than their historical baseline.",
        is_significant=significant,
        is_demo_data=current_data.is_demo_data or related_data.is_demo_data,
        is_stale=current_data.is_stale or related_data.is_stale,
        data_source=current_data.source if current_data.source == related_data.source else f"{current_data.source} + {related_data.source}",
    )
