from app.schemas.relationships import RelationshipResponse
from app.services.database import get_supabase_service_client


def persist_relationships(symbol: str, relationships: list[RelationshipResponse]) -> bool:
    try:
        client = get_supabase_service_client()
    except RuntimeError:
        return False
    rows = [{
        "symbol_a": min(symbol, relationship.related_symbol),
        "symbol_b": max(symbol, relationship.related_symbol),
        "relationship_type": relationship.relationship_type,
        "correlation": relationship.correlation,
        "baseline_correlation": relationship.historical_correlation,
        "change_score": relationship.correlation_change,
    } for relationship in relationships if relationship.is_significant]
    if rows:
        client.table("relationships").insert(rows).execute()
    return True
