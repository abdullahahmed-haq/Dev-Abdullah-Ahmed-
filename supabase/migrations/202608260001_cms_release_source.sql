create table if not exists public.cms_state (
  singleton boolean primary key default true check (singleton),
  draft_revision bigint not null default 0 check (draft_revision >= 0),
  site jsonb not null default '{}'::jsonb,
  blog jsonb not null default '{"posts": []}'::jsonb,
  published_version text,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.cms_state (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  email text not null check (char_length(email) between 3 and 254),
  company text check (char_length(company) <= 160),
  project_type text check (char_length(project_type) <= 120),
  message text not null check (char_length(message) between 1 and 5000),
  locale text not null check (locale in ('en', 'ar')),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create index if not exists contact_messages_expiry_idx on public.contact_messages (expires_at);
create index if not exists contact_messages_rate_idx on public.contact_messages (ip_hash, created_at desc);

alter table public.cms_state enable row level security;
alter table public.admin_users enable row level security;
alter table public.contact_messages enable row level security;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create policy "admins can read cms state"
on public.cms_state for select
using (public.is_portfolio_admin());

create policy "admins can read their allowlist entry"
on public.admin_users for select
using (user_id = auth.uid());

create policy "admins can read contact messages"
on public.contact_messages for select
using (public.is_portfolio_admin());

create or replace function public.export_publishable_content(expected_revision bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  state public.cms_state%rowtype;
begin
  if not public.is_portfolio_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  select * into state from public.cms_state where singleton = true;
  if state.draft_revision <> expected_revision then
    raise exception 'draft revision conflict' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'revision', state.draft_revision,
    'site', state.site,
    'blog', state.blog
  );
end;
$$;

create or replace function public.update_cms_draft(
  expected_revision bigint,
  next_site jsonb,
  next_blog jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  state public.cms_state%rowtype;
begin
  if not public.is_portfolio_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  update public.cms_state
  set site = next_site,
      blog = next_blog,
      draft_revision = draft_revision + 1,
      updated_at = now()
  where singleton = true and draft_revision = expected_revision
  returning * into state;

  if not found then
    raise exception 'draft revision conflict' using errcode = '40001';
  end if;

  return jsonb_build_object('revision', state.draft_revision, 'site', state.site, 'blog', state.blog);
end;
$$;

create or replace function public.record_published_release(
  release_id text,
  published_at_value timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_portfolio_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  update public.cms_state
  set published_version = release_id,
      published_at = published_at_value,
      updated_at = now()
  where singleton = true;
end;
$$;

create or replace function public.submit_contact_message(
  input_name text,
  input_email text,
  input_company text,
  input_project_type text,
  input_message text,
  input_locale text,
  input_ip_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  message_id uuid;
begin
  if (select count(*) from public.contact_messages where ip_hash = input_ip_hash and created_at > now() - interval '15 minutes') >= 5 then
    raise exception 'contact rate limit exceeded' using errcode = '42901';
  end if;

  insert into public.contact_messages (name, email, company, project_type, message, locale, ip_hash)
  values (input_name, input_email, nullif(input_company, ''), nullif(input_project_type, ''), input_message, input_locale, input_ip_hash)
  returning id into message_id;

  return message_id;
end;
$$;

revoke all on public.cms_state, public.admin_users, public.contact_messages from anon, authenticated;
revoke execute on function public.is_portfolio_admin() from public, anon, authenticated;
revoke execute on function public.export_publishable_content(bigint) from public, anon, authenticated;
revoke execute on function public.update_cms_draft(bigint, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.record_published_release(text, timestamptz) from public, anon, authenticated;
revoke execute on function public.submit_contact_message(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.is_portfolio_admin() to authenticated;
grant execute on function public.export_publishable_content(bigint) to authenticated;
grant execute on function public.update_cms_draft(bigint, jsonb, jsonb) to authenticated;
grant execute on function public.record_published_release(text, timestamptz) to authenticated;
grant execute on function public.submit_contact_message(text, text, text, text, text, text, text) to service_role;
