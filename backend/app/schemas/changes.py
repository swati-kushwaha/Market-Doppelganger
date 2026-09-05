from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class CheckInRequest(BaseModel):
    watchlist_id: str


class MeaningfulChange(BaseModel):
    symbol: str
    change_type: str
    score: float
    confidence: float
    explanation: str
    signals: dict[str, Any]
    detected_at: datetime


class CheckInResponse(BaseModel):
    visit_id: str
    watchlist_id: str
    first_visit: bool
    baseline_set: bool
    previous_checked_at: datetime | None
    current_checked_at: datetime
    meaningful_changes: list[MeaningfulChange] = Field(default_factory=list)
    unchanged_symbols: list[str] = Field(default_factory=list)


class VisitStatusResponse(BaseModel):
    watchlist_id: str
    has_baseline: bool
    last_checked_at: datetime | None
    meaningful_changes: list[MeaningfulChange] = Field(default_factory=list)
