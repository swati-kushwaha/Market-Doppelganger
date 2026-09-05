from fastapi import APIRouter, HTTPException

from app.providers.demo import DemoMarketDataProvider
from app.providers.factory import get_market_data_provider
from app.schemas.relationships import RelationshipGraphResponse
from app.services.relationship_repository import persist_relationships
from app.services.relationships import build_relationship, related_symbols

router = APIRouter(prefix="/api", tags=["relationships"])


@router.get("/relationships/{symbol}", response_model=RelationshipGraphResponse)
async def get_relationships(symbol: str) -> RelationshipGraphResponse:
    normalized_symbol = symbol.strip().upper()
    if not normalized_symbol or len(normalized_symbol) > 20:
        raise HTTPException(status_code=400, detail="A valid symbol is required")
    provider = get_market_data_provider()
    try:
        current_data = await provider.get_market_data(normalized_symbol)
        related_data = [(related, await provider.get_market_data(related)) for related in related_symbols(normalized_symbol)]
    except RuntimeError as error:
        if provider.__class__ is DemoMarketDataProvider:
            raise HTTPException(status_code=502, detail=str(error)) from error
        demo_provider = DemoMarketDataProvider()
        current_data = await demo_provider.get_market_data(normalized_symbol)
        related_data = [(related, await demo_provider.get_market_data(related)) for related in related_symbols(normalized_symbol)]

    relationships = [build_relationship(normalized_symbol, related, current_data, data) for related, data in related_data]
    persist_relationships(normalized_symbol, relationships)
    return RelationshipGraphResponse(
        symbol=normalized_symbol,
        relationships=relationships,
        is_demo_data=any(relationship.is_demo_data for relationship in relationships),
        data_source=current_data.source,
    )
