create or replace function public.enforce_candidate_application_readiness()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
declare
  verified boolean;
  has_payout_method boolean;
begin
  if auth.uid() is null or auth.uid() is distinct from new.user_id then
    return new;
  end if;

  select exists (
    select 1 from public.verification_profiles v
    where v.user_id = new.user_id
      and v.status = 'verified'
      and v.verified_at is not null
  ) into verified;

  if not verified then
    raise exception 'Identity verification must be approved before you can apply for jobs.';
  end if;

  select exists (
    select 1 from public.payout_methods pm
    where pm.user_id = new.user_id
      and pm.status = 'active'
  ) into has_payout_method;

  if not has_payout_method then
    raise exception 'Add an active payout method before you can apply for jobs.';
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_candidate_application_readiness on public.applications;
create trigger enforce_candidate_application_readiness
before insert or update of user_id, job_id, status, submitted_at
on public.applications
for each row
execute function public.enforce_candidate_application_readiness();
