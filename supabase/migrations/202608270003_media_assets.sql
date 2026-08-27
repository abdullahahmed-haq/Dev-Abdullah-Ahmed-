create table if not exists public.media_assets (
  public_id text primary key check (public_id ~ '^portfolio/[A-Za-z0-9_/-]+$'),
  secure_url text not null,
  resource_type text not null check (resource_type in ('image', 'video')),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  bytes integer check (bytes is null or bytes > 0),
  alt text not null default '' check (char_length(alt) <= 500),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;

create policy "admins can read media assets"
on public.media_assets for select
using (public.is_portfolio_admin());
