insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('form-uploads','form-uploads',false,10485760,null)
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=null;

drop policy if exists "form upload owner read or admin" on storage.objects;
create policy "form upload owner read or admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'form-uploads'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.is_admin())
  )
);

drop policy if exists "form upload owner insert" on storage.objects;
create policy "form upload owner insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'form-uploads'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
