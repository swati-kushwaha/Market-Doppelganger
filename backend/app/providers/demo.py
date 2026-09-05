import hashlib
from datetime import datetime, timedelta, timezone

from app.schemas.fingerprint import MarketDataResponse, MarketPoint

DEMO_RELATIONSHIP_GROUPS = (
    ("RELIANCE", "ONGC", "IOC", "BPCL", "NTPC", "POWERGRID"),
    ("TCS", "INFY", "HCLTECH", "WIPRO"),
    ("HDFCBANK", "ICICIBANK", "AXISBANK", "SBIN"),
)


class DemoMarketDataProvider:
    """Deterministic market-shaped data, always labeled as demo data."""

    def __init__(self, history_length: int = 30) -> None:
        self.history_length = history_length

    async def get_market_data(self, symbol: str) -> MarketDataResponse:
        normalized_symbol = symbol.strip().upper()
        seed = int(hashlib.sha256(normalized_symbol.encode()).hexdigest()[:8], 16)
        now = datetime.now(timezone.utc).replace(microsecond=0)
        base_price = 80 + seed % 220
        drift = ((seed % 17) - 8) / 1000
        phase = seed % 13
        relationship_group = next((group for group in DEMO_RELATIONSHIP_GROUPS if normalized_symbol in group), None)
        group_seed = sum(sum(ord(character) for character in member) for member in relationship_group) if relationship_group else 0
        points: list[MarketPoint] = []
        benchmark: list[MarketPoint] = []
        sector: list[MarketPoint] = []
        for index in range(self.history_length):
            timestamp = now - timedelta(days=self.history_length - index - 1)
            if relationship_group and index >= self.history_length - 11:
                shared_cycle = ((group_seed + index * 17) % 9 - 4) / 100
                symbol_noise = (((seed + index * 19) % 7) - 3) / 1000
                cycle = shared_cycle + symbol_noise
            else:
                cycle = ((index + phase) % 9 - 4) / 100
            price = base_price * (1 + drift * index + cycle)
            volume = 900_000 + ((seed + index * 7919) % 180_000)
            points.append(MarketPoint(timestamp=timestamp, price=max(price, 1), volume=volume))
            benchmark.append(MarketPoint(timestamp=timestamp, price=100 * (1 + index * 0.0015 + ((index + 3) % 7 - 3) / 100), volume=1_000_000))
            sector.append(MarketPoint(timestamp=timestamp, price=120 * (1 + index * 0.0018 + ((index + phase) % 8 - 4) / 100), volume=800_000))
        return MarketDataResponse(
            symbol=normalized_symbol,
            points=points,
            benchmark_points=benchmark,
            sector_points=sector,
            source="demo",
            timestamp=now,
            is_stale=False,
            delay_seconds=0,
            is_demo_data=True,
        )

    async def get_market_status(self) -> object:
        return {"source": "demo", "is_demo_data": True, "is_stale": False}
