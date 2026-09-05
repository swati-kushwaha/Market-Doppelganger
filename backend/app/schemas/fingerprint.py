from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MarketPoint(BaseModel):
    timestamp: datetime
    price: float = Field(gt=0)
    volume: float = Field(ge=0)


class MarketDataResponse(BaseModel):
    symbol: str
    points: list[MarketPoint] = Field(min_length=2)
    benchmark_points: list[MarketPoint] = Field(min_length=2)
    sector_points: list[MarketPoint] = Field(min_length=2)
    source: str
    timestamp: datetime
    is_stale: bool
    delay_seconds: int
    is_demo_data: bool


class FingerprintResponse(BaseModel):
    symbol: str
    timestamp: datetime
    features: dict[str, float]
    vector: list[float]
    data_source: str
    is_demo_data: bool
    is_stale: bool
    delay_seconds: int
    persisted: bool
    persistence_warning: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
