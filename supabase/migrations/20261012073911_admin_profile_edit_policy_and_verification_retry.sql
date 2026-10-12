create policy "profiles_admin_update_all"
on public.profiles
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create or replace function private.prevent_verification_user_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $function$
declare
  is_admin_actor boolean;
  front_count integer;
  back_count integer;
  identity_count integer;
begin
  is_admin_actor := private.is_admin();

  if auth.uid() is not null and not is_admin_actor then
    if new.user_id is distinct from old.user_id
       or new.provider is distinct from old.provider
       or new.provider_reference is distinct from old.provider_reference
       or new.verified_at is distinct from old.verified_at
       or new.needs_attention_reason is distinct from old.needs_attention_reason then
      raise exception 'Verification status is managed by the verification service';
    end if;

    if new.status is distinct from old.status or new.submitted_at is distinct from old.submitted_at then
      if old.status in ('needs_attention','rejected')
         and new.status = 'in_progress'
         and new.submitted_at is null then
        return new;
      end if;

      if old.status <> 'in_progress'
         or new.status <> 'pending'
         or new.submitted_at is null then
        raise exception 'Members may only submit a complete verification for admin review';
      end if;

      select count(*) filter (where side = 'front'), count(*) filter (where side = 'back')
        into front_count, back_count
        from public.verification_documents
       where verification_id = old.id
         and status = 'submitted'
         and storage_path is not null;

      select count(*) into identity_count
        from public.demo_identity_records
       where verification_id = old.id
         and user_id = old.user_id;

      if coalesce(front_count,0) < 1 or coalesce(back_count,0) < 1 or coalesce(identity_count,0) < 1 then
        raise exception 'Verification submission is incomplete: both document sides and all required identity fields must be saved first';
      end if;
    end if;
  end if;
  return new;
end;
$function$;
