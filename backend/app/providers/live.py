import asyncio
import json
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import settings
from app.schemas.fingerprint import MarketDataResponse, MarketPoint


class LiveMarketDataProvider:
    """Adapter for a configured provider exposing the documented JSON contract."""

    async def get_market_data(self, symbol: str) -> MarketDataResponse:
        if not settings.market_data_api_url:
            raise RuntimeError("MARKET_DATA_API_URL is not configured")
        payload = await asyncio.to_thread(self._fetch, symbol.strip().upper())
        response_timestamp = datetime.fromisoformat(payload["timestamp"].replace("Z", "+00:00"))
        if response_timestamp.tzinfo is None:
            response_timestamp = response_timestamp.replace(tzinfo=timezone.utc)
        delay_seconds = max(0, int((datetime.now(timezone.utc) - response_timestamp).total_seconds()))
        return MarketDataResponse(
            symbol=symbol.strip().upper(),
            points=[MarketPoint.model_validate(point) for point in payload["points"]],
            benchmark_points=[MarketPoint.model_validate(point) for point in payload["benchmark_points"]],
            sector_points=[MarketPoint.model_validate(point) for point in payload["sector_points"]],
            source=str(payload.get("source", "live")),
            timestamp=response_timestamp,
            is_stale=delay_seconds > settings.market_data_stale_after_seconds,
            delay_seconds=delay_seconds,
            is_demo_data=False,
        )

    def _fetch(self, symbol: str) -> dict:
        url = f"{settings.market_data_api_url.rstrip('/')}/market-data/{symbol}"
        request = Request(url, headers={"Accept": "application/json", **self._auth_headers()})
        try:
            with urlopen(request, timeout=settings.market_data_timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError) as error:
            raise RuntimeError(f"Live market provider request failed: {error}") from error

    def _auth_headers(self) -> dict[str, str]:
        if not settings.market_data_api_key:
            return {}
        return {"Authorization": f"Bearer {settings.market_data_api_key}"}

    async def get_market_status(self) -> object:
        return {"source": "live", "is_demo_data": False}
