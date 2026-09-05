from fastapi import APIRouter

from app.schemas.explanation import ExplanationFacts, ExplanationResponse
from app.services.explanation import explain_facts

router = APIRouter(prefix="/api", tags=["explanations"])


@router.post("/explanation", response_model=ExplanationResponse)
async def create_explanation(facts: ExplanationFacts) -> ExplanationResponse:
    return await explain_facts(facts)
