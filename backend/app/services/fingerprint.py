from statistics import mean, pstdev

from app.schemas.fingerprint import FingerprintResponse, MarketDataResponse

FEATURE_NAMES = (
    "price_return",
    "momentum",
    "volume_anomaly",
    "volatility",
    "benchmark_relative_strength",
    "sector_relative_strength",
    "sector_momentum",
    "benchmark_momentum",
)


def _returns(prices: list[float]) -> list[float]:
    return [(current / previous) - 1 for previous, current in zip(prices, prices[1:]) if previous]


def _clip(value: float) -> float:
    return round(max(0.0, min(1.0, value)), 4)


def _centered_score(value: float, scale: float) -> float:
    return _clip(0.5 + (value / scale if scale else 0))


def calculate_features(data: MarketDataResponse) -> dict[str, float]:
    prices = [point.price for point in data.points]
    volumes = [point.volume for point in data.points]
    benchmark_prices = [point.price for point in data.benchmark_points]
    sector_prices = [point.price for point in data.sector_points]
    stock_returns = _returns(prices)
    benchmark_returns = _returns(benchmark_prices)
    sector_returns = _returns(sector_prices)
    recent_returns = stock_returns[-5:]
    price_return = (prices[-1] / prices[0]) - 1
    momentum = mean(recent_returns) if recent_returns else 0
    baseline_volume = mean(volumes[:-5]) if len(volumes) > 5 else mean(volumes)
    volume_ratio = volumes[-1] / baseline_volume if baseline_volume else 1
    volatility = pstdev(stock_returns) if len(stock_returns) > 1 else 0
    benchmark_return = (benchmark_prices[-1] / benchmark_prices[0]) - 1
    sector_return = (sector_prices[-1] / sector_prices[0]) - 1
    return {
        "price_return": _centered_score(price_return, 0.2),
        "momentum": _centered_score(momentum, 0.05),
        "volume_anomaly": _clip((volume_ratio - 0.5) / 2.5),
        "volatility": _clip(volatility / 0.08),
        "benchmark_relative_strength": _centered_score(price_return - benchmark_return, 0.15),
        "sector_relative_strength": _centered_score(price_return - sector_return, 0.15),
        "sector_momentum": _centered_score(mean(sector_returns[-5:]) if sector_returns else 0, 0.05),
        "benchmark_momentum": _centered_score(mean(benchmark_returns[-5:]) if benchmark_returns else 0, 0.05),
    }


def build_fingerprint(data: MarketDataResponse) -> FingerprintResponse:
    features = calculate_features(data)
    return FingerprintResponse(
        symbol=data.symbol,
        timestamp=data.timestamp,
        features=features,
        vector=[features[name] for name in FEATURE_NAMES],
        data_source=data.source,
        is_demo_data=data.is_demo_data,
        is_stale=data.is_stale,
        delay_seconds=data.delay_seconds,
        persisted=False,
        metadata={"feature_names": list(FEATURE_NAMES), "method": "bounded normalized prototype features"},
    )
