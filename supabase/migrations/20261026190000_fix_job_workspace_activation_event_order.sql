-- Make job workspace activation independent of whether the hire decision or
-- interview completion happens first. This migration intentionally does not
-- backfill or modify any existing candidate/application records.

create or replace function public.ensure_hired_application_job_workspace(p_application_id bigint)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_candidate_id uuid;
  v_job_id bigint;
  v_access_id bigint;
  v_email text;
  v_first_name text;
  v_job_title text;
  v_company_name text;
  v_completed_at timestamptz;
  v_send_after timestamptz;
begin
  select a.user_id, a.job_id, completed_interview.completed_at
    into v_candidate_id, v_job_id, v_completed_at
  from public.applications a
  join lateral (
    select i.completed_at
    from public.interviews i
    where i.application_id = a.id
      and i.status = 'completed'
      and i.completed_at is not null
    order by i.completed_at desc
    limit 1
  ) completed_interview on true
  where a.id = p_application_id
    and a.status = 'hired';

  -- Do not create workspace access until both conditions are true:
  -- the application is hired and at least one interview is complete.
  if v_candidate_id is null or v_completed_at is null then
    return;
  end if;

  insert into public.job_workspace_access (application_id, candidate_id, job_id)
  values (p_application_id, v_candidate_id, v_job_id)
  on conflict (application_id) do nothing
  returning id into v_access_id;

  -- The access row remains the idempotency guard for the one-off offer email.
  if v_access_id is null then
    return;
  end if;

  select u.email, coalesce(nullif(trim(p.full_name), ''), 'there')
    into v_email, v_first_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_candidate_id;

  select j.title, j.company_name
    into v_job_title, v_company_name
  from public.jobs j
  where j.id = v_job_id;

  v_send_after := greatest(v_completed_at + interval '15 minutes', now());
  v_first_name := split_part(v_first_name, ' ', 1);

  if v_email is not null then
    insert into public.admin_email_queue
      (application_id, candidate_id, recipient_email, subject, body, route_path, send_after, status)
    values
      (
        p_application_id,
        v_candidate_id,
        v_email,
        'Job Offer and Next Steps — RemoteWay',
        'Dear ' || v_first_name || E',\n\nCongratulations! We are pleased to inform you that you have been selected for the ' ||
        coalesce(v_job_title, 'position') ||
        case when nullif(v_company_name, '') is not null then ' with ' || v_company_name else '' end ||
        ' through RemoteWay.' ||
        E'\n\nAs part of onboarding, please open your Job Workspace and provide your internet or mobile network provider name, connection type, and other important network provider information. This will help us assess your connectivity requirements and arrange the appropriate working tools and technical setup for your role.' ||
        E'\n\nOpen your Job Workspace to complete this step:\nhttps://remoteway.work/#/job-workspace' ||
        E'\n\nKind regards,\nRemoteWay Recruitment Team\nhttps://remoteway.work\nWork. Anywhere.',
        '/#/job-workspace',
        v_send_after,
        'queued'
      );
  end if;
end;
$function$;

-- Keep the existing application-status trigger, but delegate activation to the
-- shared idempotent helper.
create or replace function public.handle_hired_application_job_workspace()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status <> 'hired' or old.status = 'hired' then
    return new;
  end if;

  perform public.ensure_hired_application_job_workspace(new.id);
  return new;
end;
$function$;

-- If the application was already hired before the interview completed, this
-- second trigger runs the same helper when the interview completion is saved.
create or replace function public.handle_completed_interview_job_workspace()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status <> 'completed' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'completed' then
    return new;
  end if;

  perform public.ensure_hired_application_job_workspace(new.application_id);
  return new;
end;
$function$;

drop trigger if exists interviews_create_job_workspace_on_completion on public.interviews;
create trigger interviews_create_job_workspace_on_completion
after insert or update of status on public.interviews
for each row
execute function public.handle_completed_interview_job_workspace();

-- Trigger functions are not intended to be callable as client-facing RPCs.
revoke all on function public.ensure_hired_application_job_workspace(bigint) from public, anon, authenticated;
revoke all on function public.handle_completed_interview_job_workspace() from public, anon, authenticated;
