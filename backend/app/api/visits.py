from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_authenticated_user
from app.providers.factory import get_market_data_provider
from app.schemas.changes import CheckInRequest, CheckInResponse, MeaningfulChange, VisitStatusResponse
from app.services.checkins import check_in_watchlist
from app.services.database import get_supabase_service_client

router = APIRouter(prefix="/api/visits", tags=["visits"])


def _latest_visit_status(watchlist_id: str, user_id: str) -> VisitStatusResponse:
    client = get_supabase_service_client()
    visits = client.table("user_visits").select("id, checked_at").eq("user_id", user_id).eq("watchlist_id", watchlist_id).order("checked_at", desc=True).limit(1).execute()
    if not visits.data:
        return VisitStatusResponse(watchlist_id=watchlist_id, has_baseline=False, last_checked_at=None)
    latest = visits.data[0]
    changes = client.table("detected_changes").select("symbol, change_type, score, confidence, explanation, signals, detected_at").eq("user_id", user_id).eq("watchlist_id", watchlist_id).gte("detected_at", latest["checked_at"]).order("detected_at", desc=True).execute()
    return VisitStatusResponse(
        watchlist_id=watchlist_id,
        has_baseline=True,
        last_checked_at=latest["checked_at"],
        meaningful_changes=[MeaningfulChange.model_validate(change) for change in (changes.data or [])],
    )


@router.get("/latest/{watchlist_id}", response_model=VisitStatusResponse)
async def latest_visit(watchlist_id: str, user: dict = Depends(get_authenticated_user)) -> VisitStatusResponse:
    try:
        return _latest_visit_status(watchlist_id, user["id"])
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.post("/check-in", response_model=CheckInResponse)
async def check_in(request: CheckInRequest, user: dict = Depends(get_authenticated_user)) -> CheckInResponse:
    try:
        return await check_in_watchlist(
            client=get_supabase_service_client(),
            provider=get_market_data_provider(),
            user_id=user["id"],
            watchlist_id=request.watchlist_id,
        )
    except PermissionError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
