-- ILX lender backend RLS policies + hardening (test mode). Idempotent.

-- Helper: the lender id mapped to the current auth user.
create or replace function public.my_lender_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select lender_id from public.lender_users where auth_user_id = auth.uid()
$$;

revoke all on function public.my_lender_id() from public, anon;
grant execute on function public.my_lender_id() to authenticated;

alter table public.lenders enable row level security;
alter table public.lender_guidelines enable row level security;
alter table public.lender_users enable row level security;
alter table public.lender_interest enable row level security;

-- lenders: read own row; update own row, contact fields only (identity fields
-- - company, email, lender_type, nmls_id - change through the owner).
drop policy if exists lenders_select_own on public.lenders;
create policy lenders_select_own on public.lenders
  for select to authenticated
  using (id = public.my_lender_id());

drop policy if exists lenders_update_own on public.lenders;
create policy lenders_update_own on public.lenders
  for update to authenticated
  using (id = public.my_lender_id())
  with check (id = public.my_lender_id());

revoke update on public.lenders from authenticated;
grant update (contact_name, phone) on public.lenders to authenticated;

-- lender_guidelines: read own versions; insert own versions; no update or
-- delete (versions are immutable). pdf_path must point inside the lender's
-- own storage folder.
drop policy if exists guidelines_select_own on public.lender_guidelines;
create policy guidelines_select_own on public.lender_guidelines
  for select to authenticated
  using (lender_id = public.my_lender_id());

drop policy if exists guidelines_insert_own on public.lender_guidelines;
create policy guidelines_insert_own on public.lender_guidelines
  for insert to authenticated
  with check (
    lender_id = public.my_lender_id()
    and (pdf_path is null
         or pdf_path ~ ('^' || public.my_lender_id()::text || '/[^/]+\.pdf$'))
  );

-- lender_users: a lender reads their own mapping row; no client writes -
-- only the owner (service role) maps a login to a lender, after verification.
drop policy if exists lender_users_select_own on public.lender_users;
create policy lender_users_select_own on public.lender_users
  for select to authenticated
  using (auth_user_id = auth.uid());

-- lender_interest: no client policies - service role only while intake is in test mode.

-- Storage: scope the private guidelines bucket by lender folder
-- (guidelines/{lender_id}/...).
drop policy if exists guidelines_bucket_read_own on storage.objects;
create policy guidelines_bucket_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'guidelines' and (storage.foldername(name))[1] = public.my_lender_id()::text);

drop policy if exists guidelines_bucket_write_own on storage.objects;
create policy guidelines_bucket_write_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'guidelines' and (storage.foldername(name))[1] = public.my_lender_id()::text);

-- Files are immutable like the versions they belong to: no update or delete
-- policies. Each version gets a new path; an old PDF can never be swapped or
-- removed behind its record.
drop policy if exists guidelines_bucket_update_own on storage.objects;
drop policy if exists guidelines_bucket_delete_own on storage.objects;
