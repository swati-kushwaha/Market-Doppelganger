from pydantic import BaseModel, ConfigDict, Field


class ExplanationFacts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    symbol: str = Field(min_length=1, max_length=20)
    price_change: float
    volume_multiple: float = Field(ge=0)
    sector_change: float
    correlation_change: float
    historical_similarity: float = Field(ge=0, le=1)
    historical_sample_size: int = Field(ge=0)


class ExplanationResponse(BaseModel):
    observed_facts: str
    historical_context: str
    interpretation: str
    source: str
    is_fallback: bool
