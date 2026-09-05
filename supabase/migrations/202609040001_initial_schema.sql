create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index watchlists_user_updated_idx on public.watchlists(user_id, updated_at desc);

create table public.watchlist_stocks (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.watchlists(id) on delete cascade,
  symbol text not null,
  exchange text not null default 'NSE',
  added_at timestamptz not null default now(),
  unique (watchlist_id, symbol)
);

create table public.user_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  watchlist_id uuid references public.watchlists(id) on delete cascade,
  checked_at timestamptz not null default now(),
  snapshot_cutoff timestamptz
);
create index user_visits_lookup_idx on public.user_visits(user_id, watchlist_id, checked_at desc);

create table public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  exchange text not null default 'NSE',
  price numeric,
  previous_close numeric,
  volume bigint,
  observed_at timestamptz not null,
  source text not null,
  is_stale boolean not null default false,
  delay_seconds integer,
  metadata jsonb not null default '{}'::jsonb
);
create index market_snapshots_symbol_observed_idx on public.market_snapshots(symbol, observed_at desc);

create table public.market_fingerprints (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  snapshot_id uuid references public.market_snapshots(id),
  feature_version text not null,
  features jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  data_quality jsonb not null default '{}'::jsonb
);
create index market_fingerprints_symbol_calculated_idx on public.market_fingerprints(symbol, calculated_at desc);

create table public.detected_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  watchlist_id uuid references public.watchlists(id) on delete cascade,
  symbol text,
  change_type text not null,
  score numeric,
  confidence numeric,
  explanation text,
  signals jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  baseline_visit_id uuid references public.user_visits(id)
);
create index detected_changes_user_detected_idx on public.detected_changes(user_id, detected_at desc);

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  symbol_a text not null,
  symbol_b text not null,
  relationship_type text not null,
  correlation numeric,
  baseline_correlation numeric,
  change_score numeric,
  calculated_at timestamptz not null default now(),
  check (symbol_a < symbol_b),
  unique (symbol_a, symbol_b, relationship_type, calculated_at)
);

create table public.historical_events (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  event_date date not null,
  feature_version text not null,
  fingerprint jsonb not null,
  future_return_1d numeric,
  future_return_3d numeric,
  future_return_5d numeric,
  source text not null,
  unique (symbol, event_date, feature_version)
);

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  provider_type text not null,
  last_success_at timestamptz,
  status text not null default 'not_configured',
  metadata jsonb not null default '{}'::jsonb
);

create table public.user_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  meaningful_change_threshold numeric,
  scoring_weights jsonb not null default '{}'::jsonb,
  demo_mode_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.watchlists enable row level security;
alter table public.watchlist_stocks enable row level security;
alter table public.user_visits enable row level security;
alter table public.detected_changes enable row level security;
alter table public.user_preferences enable row level security;

create policy "users own profile" on public.users for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "users own watchlists" on public.watchlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own watchlist stocks" on public.watchlist_stocks for all using (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid())) with check (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid()));
create policy "users own visits" on public.user_visits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own changes" on public.detected_changes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users own preferences" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
