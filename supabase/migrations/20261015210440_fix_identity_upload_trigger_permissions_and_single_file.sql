create or replace function private.prevent_verification_user_status_change()
returns trigger
language plpgsql
security invoker
set search_path = public, private
as $function$
declare
  is_admin_actor boolean;
  document_count integer;
  identity_count integer;
begin
  select exists(
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin','super_admin')
  ) into is_admin_actor;

  if auth.uid() is not null and not is_admin_actor then
    if new.user_id is distinct from old.user_id
       or new.provider is distinct from old.provider
       or new.provider_reference is distinct from old.provider_reference
       or new.verified_at is distinct from old.verified_at
       or new.needs_attention_reason is distinct from old.needs_attention_reason then
      raise exception 'Verification status is managed by the verification service';
    end if;

    if new.status is distinct from old.status or new.submitted_at is distinct from old.submitted_at then
      if old.status in ('required','needs_attention','rejected')
         and new.status = 'in_progress'
         and new.submitted_at is null then
        return new;
      end if;

      if old.status <> 'in_progress'
         or new.status <> 'pending'
         or new.submitted_at is null then
        raise exception 'Members may only submit a complete verification for admin review';
      end if;

      select count(*)
        into document_count
        from public.verification_documents
       where verification_id = old.id
         and status = 'submitted'
         and nullif(btrim(storage_path),'') is not null;

      select count(*)
        into identity_count
        from public.demo_identity_records
       where verification_id = old.id
         and user_id = old.user_id;

      if coalesce(document_count,0) < 1 or coalesce(identity_count,0) < 1 then
        raise exception 'Verification submission is incomplete: one identity document and all required identity fields must be saved first';
      end if;
    end if;
  end if;
  return new;
end;
$function$;
