from app.config import settings
from app.providers.demo import DemoMarketDataProvider
from app.providers.live import LiveMarketDataProvider
from app.providers.market import MarketDataProvider


def get_market_data_provider() -> MarketDataProvider:
    if settings.market_data_api_url:
        return LiveMarketDataProvider()
    return DemoMarketDataProvider()
