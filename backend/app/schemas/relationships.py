from pydantic import BaseModel


class RelationshipResponse(BaseModel):
    related_symbol: str
    correlation: float
    historical_correlation: float
    correlation_change: float
    similarity: float
    relationship_type: str
    confidence: float
    explanation: str
    is_significant: bool
    is_demo_data: bool
    is_stale: bool
    data_source: str


class RelationshipGraphResponse(BaseModel):
    symbol: str
    relationships: list[RelationshipResponse]
    is_demo_data: bool
    data_source: str
