import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from typing import Any

from app.providers.demo import DemoMarketDataProvider
from app.schemas.fingerprint import FingerprintResponse
from app.schemas.changes import MeaningfulChange
from app.services.checkins import check_in_watchlist
from app.services.meaningful_changes import score_fingerprint_change


class FakeResult:
    def __init__(self, data: list[dict[str, Any]]) -> None:
        self.data = data


class FakeTable:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.rows = rows
        self.filters: list[tuple[str, str, Any]] = []
        self.order_field: str | None = None
        self.desc = False
        self.limit_count: int | None = None
        self.payload: Any = None

    def select(self, *_: Any) -> "FakeTable": return self
    def eq(self, field: str, value: Any) -> "FakeTable": self.filters.append(("eq", field, value)); return self
    def in_(self, field: str, values: list[Any]) -> "FakeTable": self.filters.append(("in", field, values)); return self
    def lte(self, field: str, value: Any) -> "FakeTable": self.filters.append(("lte", field, value)); return self
    def gte(self, field: str, value: Any) -> "FakeTable": self.filters.append(("gte", field, value)); return self
    def order(self, field: str, desc: bool = False) -> "FakeTable": self.order_field = field; self.desc = desc; return self
    def limit(self, count: int) -> "FakeTable": self.limit_count = count; return self
    def insert(self, payload: Any) -> "FakeTable":
        self.payload = payload
        values = payload if isinstance(payload, list) else [payload]
        for value in values:
            value = dict(value)
            value.setdefault("id", f"id-{len(self.rows) + 1}")
            self.rows.append(value)
        return self

    def execute(self) -> FakeResult:
        result = list(self.rows)
        for kind, field, value in self.filters:
            if kind == "eq": result = [row for row in result if row.get(field) == value]
            if kind == "in": result = [row for row in result if row.get(field) in value]
            if kind == "lte": result = [row for row in result if row.get(field, "") <= value]
            if kind == "gte": result = [row for row in result if row.get(field, "") >= value]
        if self.order_field: result.sort(key=lambda row: row.get(self.order_field, ""), reverse=self.desc)
        if self.limit_count is not None: result = result[:self.limit_count]
        return FakeResult(result)


class FakeClient:
    def __init__(self) -> None:
        self.tables = {
            "watchlists": [{"id": "watchlist-1", "user_id": "user-1", "watchlist_stocks": [{"symbol": "RELIANCE", "exchange": "NSE"}]}],
            "user_visits": [],
            "market_snapshots": [],
            "market_fingerprints": [],
            "detected_changes": [],
        }

    def table(self, name: str) -> FakeTable:
        return FakeTable(self.tables[name])


class CheckInTests(unittest.TestCase):
    def test_check_in_route_requires_authentication(self) -> None:
        from fastapi.testclient import TestClient

        from app.main import app

        response = TestClient(app).post("/api/visits/check-in", json={"watchlist_id": "watchlist-1"})
        self.assertEqual(response.status_code, 401)

    def test_first_visit_sets_baseline_and_second_visit_is_quiet(self) -> None:
        client = FakeClient()
        provider = DemoMarketDataProvider()
        first = asyncio.run(check_in_watchlist(client, provider, "user-1", "watchlist-1"))
        second = asyncio.run(check_in_watchlist(client, provider, "user-1", "watchlist-1"))
        self.assertTrue(first.first_visit)
        self.assertTrue(first.baseline_set)
        self.assertFalse(second.first_visit)
        self.assertEqual(len(client.tables["user_visits"]), 2)
        self.assertEqual(second.meaningful_changes, [])

    def test_check_in_rejects_watchlist_owned_by_another_user(self) -> None:
        client = FakeClient()
        with self.assertRaises(PermissionError):
            asyncio.run(check_in_watchlist(client, DemoMarketDataProvider(), "another-user", "watchlist-1"))

    def test_meaningful_change_uses_previous_fingerprint_only(self) -> None:
        timestamp = datetime.now(timezone.utc)
        previous = self._fingerprint(timestamp, 0.5)
        current = self._fingerprint(timestamp + timedelta(minutes=1), 0.9)
        change = score_fingerprint_change(previous, current, timestamp + timedelta(minutes=1))
        self.assertIsInstance(change, MeaningfulChange)
        self.assertGreaterEqual(change.score, 0.35)
        self.assertIn("feature_deltas", change.signals)
        self.assertNotIn("future_return_1d", change.signals)

    def test_small_change_is_not_reported(self) -> None:
        timestamp = datetime.now(timezone.utc)
        previous = self._fingerprint(timestamp, 0.5)
        current = self._fingerprint(timestamp + timedelta(minutes=1), 0.51)
        self.assertIsNone(score_fingerprint_change(previous, current, timestamp + timedelta(minutes=1)))

    @staticmethod
    def _fingerprint(timestamp: datetime, value: float) -> FingerprintResponse:
        features = {
            "price_return": value,
            "momentum": value,
            "volume_anomaly": value,
            "volatility": value,
            "benchmark_relative_strength": value,
            "sector_relative_strength": value,
            "sector_momentum": value,
            "benchmark_momentum": value,
        }
        return FingerprintResponse(symbol="RELIANCE", timestamp=timestamp, features=features, vector=list(features.values()), data_source="demo", is_demo_data=True, is_stale=False, delay_seconds=0, persisted=True)


if __name__ == "__main__":
    unittest.main()
