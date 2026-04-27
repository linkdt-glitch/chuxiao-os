insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', false)
on conflict (id) do update set public = false;

drop policy if exists "company assets org read" on storage.objects;
drop policy if exists "company assets org insert" on storage.objects;
drop policy if exists "company assets org update" on storage.objects;
drop policy if exists "company assets org delete" on storage.objects;

create policy "company assets org read" on storage.objects
for select to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "company assets org insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy "company assets org update" on storage.objects
for update to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.is_org_admin(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.is_org_admin(((storage.foldername(name))[1])::uuid)
);

create policy "company assets org delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.is_org_admin(((storage.foldername(name))[1])::uuid)
);
