from fastapi import Header, HTTPException

from app.services.database import get_supabase_client


async def get_authenticated_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer authentication is required")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Bearer authentication is required")
    try:
        response = get_supabase_client().auth.get_user(token)
        user = response.user
    except Exception as error:
        raise HTTPException(status_code=401, detail="Supabase session could not be verified") from error
    if not user:
        raise HTTPException(status_code=401, detail="Supabase session could not be verified")
    return {"id": user.id, "email": user.email}
