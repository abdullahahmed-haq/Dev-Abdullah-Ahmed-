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
