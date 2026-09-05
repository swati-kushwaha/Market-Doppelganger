from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.fingerprints import router as fingerprint_router
from app.api.memory import router as memory_router
from app.api.relationships import router as relationships_router
from app.api.demo import router as demo_router
from app.api.explanation import router as explanation_router
from app.api.visits import router as visits_router
from app.config import settings
from app.schemas.health import HealthResponse

app = FastAPI(title="Market Doppelganger API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(fingerprint_router)
app.include_router(memory_router)
app.include_router(relationships_router)
app.include_router(demo_router)
app.include_router(explanation_router)
app.include_router(visits_router)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="market-doppelganger-api", version="0.1.0")
