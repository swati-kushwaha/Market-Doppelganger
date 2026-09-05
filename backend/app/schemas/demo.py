from pydantic import BaseModel


class DemoQuote(BaseModel):
    symbol: str
    price_change: str
    volume: str


class DemoCorrelation(BaseModel):
    pair: str
    before: float
    after: float


class DemoSignal(BaseModel):
    kind: str
    title: str
    detail: str
    tone: str


class DemoPattern(BaseModel):
    event_date: str
    similarity: float
    future_1d: float
    future_3d: float
    future_5d: float


class DemoScenario(BaseModel):
    mode: str
    title: str
    before_quotes: list[DemoQuote]
    after_quotes: list[DemoQuote]
    correlation: DemoCorrelation
    signals: list[DemoSignal]
    historical_pattern: DemoPattern
    historical_outcomes: dict[str, float]
    sample_size: int
