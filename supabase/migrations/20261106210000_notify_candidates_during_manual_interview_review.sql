create or replace function public.complete_candidate_interview(p_interview_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'private', 'auth'
as $function$
declare
  v_interview public.interviews%rowtype;
  v_total integer;
  v_answered integer;
  v_score integer;
  v_email text;
  v_candidate_name text;
  v_job_title text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  select * into v_interview
  from public.interviews
  where id=p_interview_id and candidate_id=auth.uid()
  for update;

  if not found then
    raise exception 'Interview not found.';
  end if;

  if v_interview.status='completed' then
    return jsonb_build_object('completed',true);
  end if;

  if v_interview.status not in ('in_progress','scheduled') then
    raise exception 'This interview cannot be completed in its current state.';
  end if;

  select count(*) into v_total
  from public.interview_questions where interview_id=p_interview_id;

  select count(*) into v_answered
  from public.interview_questions q
  join public.interview_answers a on a.question_id=q.id and a.interview_id=q.interview_id
  where q.interview_id=p_interview_id and nullif(trim(a.answer),'') is not null;

  if v_total=0 or v_answered < v_total then
    raise exception 'Please answer every question before completing the interview.';
  end if;

  select count(*) into v_score
  from public.interview_questions q
  join public.interview_answer_key k on k.question_id=q.id
  join public.interview_answers a on a.question_id=q.id and a.interview_id=q.interview_id
  where q.interview_id=p_interview_id
    and a.answer ~ '^[1-4]$'
    and a.answer::integer=k.correct_option;

  update public.interview_answers
  set submitted_at=now(),saved_at=now()
  where interview_id=p_interview_id and candidate_id=auth.uid();

  insert into public.interview_results(interview_id,application_id,candidate_id,score,total_questions,passed)
  values(p_interview_id,v_interview.application_id,auth.uid(),v_score,v_total,(v_score::numeric/v_total)>=0.7)
  on conflict(interview_id) do update
  set score=excluded.score,total_questions=excluded.total_questions,passed=excluded.passed,created_at=now();

  update public.interviews
  set status='completed',completed_at=now(),current_question=v_total,updated_at=now()
  where id=p_interview_id;

  select u.email, coalesce(nullif(trim(p.full_name),''),'there'), j.title
    into v_email, v_candidate_name, v_job_title
  from auth.users u
  left join public.profiles p on p.id=u.id
  left join public.applications a on a.id=v_interview.application_id
  left join public.jobs j on j.id=a.job_id
  where u.id=auth.uid();

  if v_email is not null and not exists (
    select 1 from public.admin_email_queue q
    where q.application_id=v_interview.application_id
      and q.candidate_id=auth.uid()
      and q.subject='We have received your RemoteWay interview'
  ) then
    insert into public.admin_email_queue
      (application_id,candidate_id,recipient_email,subject,body,route_path,send_after,status)
    values
      (
        v_interview.application_id,
        auth.uid(),
        v_email,
        'We have received your RemoteWay interview',
        'Hello ' || split_part(v_candidate_name,' ',1) || E',\n\nThank you for completing your RemoteWay interview for ' ||
        coalesce(v_job_title,'the role you applied for') ||
        E'. Your interview responses and application are now being manually reviewed by our recruitment team.\n\nPlease allow approximately 30–60 minutes for this review and check your RemoteWay account for updates. Once the review is complete, we will notify you by email of the outcome and whether you have been selected to proceed.\n\nThank you for your patience and your interest in RemoteWay.\n\nKind regards,\nRemoteWay Recruitment Team\nhttps://remoteway.work',
        '/#/dashboard',
        now(),
        'queued'
      );
  end if;

  return jsonb_build_object('completed',true);
end;
$function$;