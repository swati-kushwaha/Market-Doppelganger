import unittest
from datetime import datetime, timedelta, timezone

from app.schemas.fingerprint import MarketDataResponse, MarketPoint
from app.services.relationships import build_relationship, classify_relationship, correlation


class RelationshipTests(unittest.TestCase):
    def test_correlation_and_classification(self) -> None:
        self.assertAlmostEqual(correlation([1, 2, 3, 4], [2, 4, 6, 8]), 1.0)
        self.assertEqual(classify_relationship(0.82, 0.2), ("unusual synchronization", True))
        self.assertEqual(classify_relationship(-0.7, 0.4), ("divergence", True))

    def test_recent_synchronization_is_significant(self) -> None:
        now = datetime.now(timezone.utc)
        first_prices = [100, 101, 99, 100, 102, 101, 103, 102, 104, 103, 105, 107, 106, 108, 110, 109, 111, 113, 112, 114, 116, 118, 117, 119, 121, 123, 122, 124, 126, 128]
        second_prices = [100, 103, 98, 102, 99, 104, 97, 105, 98, 106, 105, 107, 104, 109, 103, 111, 102, 113, 101, 115, 99, 117, 98, 119, 96, 121, 95, 123, 94, 125]
        current = self._data("RELIANCE", first_prices, now)
        related = self._data("ONGC", second_prices, now)
        relationship = build_relationship("RELIANCE", "ONGC", current, related)
        self.assertEqual(relationship.related_symbol, "ONGC")
        self.assertGreaterEqual(relationship.confidence, 0.5)
        self.assertIn(relationship.relationship_type, {"correlation increase", "unusual synchronization", "stable relationship"})

    @staticmethod
    def _data(symbol: str, prices: list[int], now: datetime) -> MarketDataResponse:
        points = [MarketPoint(timestamp=now - timedelta(days=len(prices) - index), price=price, volume=1000) for index, price in enumerate(prices)]
        return MarketDataResponse(symbol=symbol, points=points, benchmark_points=points, sector_points=points, source="demo", timestamp=now, is_stale=False, delay_seconds=0, is_demo_data=True)


if __name__ == "__main__":
    unittest.main()
