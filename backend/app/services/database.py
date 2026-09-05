from supabase import Client, create_client

from app.config import settings


def get_supabase_client() -> Client:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError("Supabase configuration is missing")
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_service_client() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase service-role configuration is missing; fingerprint persistence is unavailable")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
