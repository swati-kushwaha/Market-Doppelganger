import asyncio
import unittest
from datetime import timedelta, timezone, datetime

from app.providers.demo import DemoMarketDataProvider
from app.services.fingerprint import FEATURE_NAMES, build_fingerprint


class FingerprintTests(unittest.TestCase):
    def test_demo_provider_is_deterministic_and_labeled(self) -> None:
        provider = DemoMarketDataProvider()
        first = asyncio.run(provider.get_market_data("RELIANCE"))
        second = asyncio.run(provider.get_market_data("RELIANCE"))
        self.assertEqual([point.price for point in first.points], [point.price for point in second.points])
        self.assertTrue(first.is_demo_data)
        self.assertEqual(first.source, "demo")
        self.assertFalse(first.is_stale)

    def test_fingerprint_has_normalized_features_and_vector(self) -> None:
        data = asyncio.run(DemoMarketDataProvider().get_market_data("TCS"))
        fingerprint = build_fingerprint(data)
        self.assertEqual(tuple(fingerprint.features), FEATURE_NAMES)
        self.assertEqual(len(fingerprint.vector), len(FEATURE_NAMES))
        self.assertTrue(all(0 <= value <= 1 for value in fingerprint.vector))

    def test_stale_metadata_is_preserved(self) -> None:
        data = asyncio.run(DemoMarketDataProvider().get_market_data("INFY"))
        stale_data = data.model_copy(update={
            "timestamp": datetime.now(timezone.utc) - timedelta(hours=1),
            "is_stale": True,
            "delay_seconds": 3600,
        })
        fingerprint = build_fingerprint(stale_data)
        self.assertTrue(fingerprint.is_stale)
        self.assertEqual(fingerprint.delay_seconds, 3600)


if __name__ == "__main__":
    unittest.main()
