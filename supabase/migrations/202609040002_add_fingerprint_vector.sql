alter table public.market_fingerprints
  add column if not exists vector jsonb not null default '[]'::jsonb;
