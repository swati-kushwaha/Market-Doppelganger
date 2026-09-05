from fastapi import APIRouter

from app.schemas.demo import DemoScenario
from app.services.demo import get_demo_scenario

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.get("/scenario", response_model=DemoScenario)
def demo_scenario() -> DemoScenario:
    return get_demo_scenario()
