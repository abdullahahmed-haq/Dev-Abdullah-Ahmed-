create table if not exists public.cms_import_audits (
  id uuid primary key default gen_random_uuid(),
  imported_at timestamptz not null default now(),
  source_revision bigint not null check (source_revision >= 0),
  site_checksum text not null check (site_checksum ~ '^[0-9a-f]{64}$'),
  blog_checksum text not null check (blog_checksum ~ '^[0-9a-f]{64}$')
);

alter table public.cms_import_audits enable row level security;

create policy "admins can read import audits"
on public.cms_import_audits for select
using (public.is_portfolio_admin());

revoke all on public.cms_import_audits from anon, authenticated;
