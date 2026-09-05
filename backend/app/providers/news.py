from typing import Protocol


class NewsProvider(Protocol):
    """Boundary for a news provider; news is intentionally not implemented yet."""

    async def get_recent_news(self, symbol: str) -> object: ...
