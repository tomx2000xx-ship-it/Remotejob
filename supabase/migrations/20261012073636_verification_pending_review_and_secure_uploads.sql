alter table public.verification_profiles
  drop constraint if exists verification_profiles_status_check;

alter table public.verification_profiles
  add constraint verification_profiles_status_check
  check (status = any (array[
    'required'::text,
    'in_progress'::text,
    'pending'::text,
    'verified'::text,
    'needs_attention'::text,
    'rejected'::text
  ]));

drop policy if exists "verification demo uploads" on storage.objects;

create policy "verification demo uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'verification-demo'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.verification_profiles vp
    where vp.id::text = (storage.foldername(name))[2]
      and vp.user_id = (select auth.uid())
      and vp.status = 'in_progress'
  )
);
