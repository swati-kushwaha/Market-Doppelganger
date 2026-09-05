from datetime import date
from typing import Any

from pydantic import BaseModel, Field


class HistoricalEvent(BaseModel):
    symbol: str
    event_date: date
    features: dict[str, float]
    vector: list[float] = Field(min_length=1)
    future_return_1d: float
    future_return_3d: float
    future_return_5d: float
    source: str
    is_demo_data: bool = False


class SimilarHistoricalMatch(BaseModel):
    event_date: date
    similarity: float
    matching_features: list[str]
    future_return_1d: float
    future_return_3d: float
    future_return_5d: float
    source: str
    is_demo_data: bool


class OutcomeAggregate(BaseModel):
    median_return: float
    mean_return: float
    positive_frequency: float
    sample_size: int


class MarketMemoryResponse(BaseModel):
    symbol: str
    current_features: dict[str, float]
    current_vector: list[float]
    matches: list[SimilarHistoricalMatch]
    outcomes: dict[str, OutcomeAggregate]
    data_source: str
    is_demo_data: bool
    methodology: dict[str, Any]
