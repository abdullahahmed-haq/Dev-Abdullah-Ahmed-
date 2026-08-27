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
