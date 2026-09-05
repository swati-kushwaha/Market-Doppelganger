import unittest
from datetime import date

from app.schemas.fingerprint import FingerprintResponse
from app.schemas.memory import HistoricalEvent
from app.services.similarity import build_market_memory, find_top_matches


class SimilarityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.current = FingerprintResponse(
            symbol="DEMO",
            timestamp="2026-09-04T12:00:00Z",
            features={"price_return": 0.8, "momentum": 0.8, "volume_anomaly": 0.7, "volatility": 0.4, "benchmark_relative_strength": 0.75, "sector_relative_strength": 0.7, "sector_momentum": 0.6, "benchmark_momentum": 0.55},
            vector=[0.8, 0.8, 0.7, 0.4, 0.75, 0.7, 0.6, 0.55],
            data_source="demo",
            is_demo_data=True,
            is_stale=False,
            delay_seconds=0,
            persisted=False,
        )

    def test_returns_top_five_and_explanations(self) -> None:
        events = [HistoricalEvent(symbol="DEMO", event_date=date(2024, 1, index + 1), features=self.current.features, vector=self.current.vector, future_return_1d=0.01, future_return_3d=0.02, future_return_5d=-0.01, source="demo", is_demo_data=True) for index in range(10)]
        matches = find_top_matches(self.current, events)
        self.assertEqual(len(matches), 5)
        self.assertEqual(len(matches[0].matching_features), 3)
        self.assertAlmostEqual(matches[0].similarity, 1.0)

    def test_outcomes_are_aggregated_separately(self) -> None:
        events = [HistoricalEvent(symbol="DEMO", event_date=date(2024, 1, index + 1), features=self.current.features, vector=self.current.vector, future_return_1d=0.01 * index, future_return_3d=0.02, future_return_5d=-0.01, source="demo", is_demo_data=True) for index in range(10)]
        memory = build_market_memory(self.current, events)
        self.assertEqual(memory.outcomes["1d"].sample_size, 5)
        self.assertEqual(memory.outcomes["3d"].positive_frequency, 1.0)
        self.assertTrue(memory.is_demo_data)


if __name__ == "__main__":
    unittest.main()
