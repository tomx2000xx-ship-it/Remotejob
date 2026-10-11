-- Add scenario data and private reference answers for the 240 weekday practice tasks.
alter table private.job_task_answer_keys
  add column if not exists reference_answer text not null default '';

with scenarios as (
  select t.id,t.job_id,t.day_number,
    case
      when t.job_id=1 then format('The fictional service dashboard shows %s open cases, %s overdue cases, %s repeat contacts, and %s%% quality against a 95%% target.',100+t.day_number*2,8+(t.day_number%7),4+(t.day_number%5),90+(t.day_number%6))
      when t.job_id in (6,11) then format('A fictional customer reports order RW-%s is %s days late. Tracking has no new scan, and the practice refund policy allows automatic refunds only after 7 days.',1000+t.day_number,1+(t.day_number%4))
      when t.job_id in (2,4,5,12) then format('The fictional spreadsheet has %s records, %s duplicate entries, %s missing email addresses, inconsistent date formats, and a 3:00 PM deadline.',80+t.day_number*2,2+(t.day_number%4),3+(t.day_number%5))
      when t.job_id=3 then format('A fictional prospect at Northstar Retail is considering %s seats with a monthly budget of $%s, wants to launch in %s days, and is concerned about onboarding time.',10+t.day_number,800+t.day_number*50,14+t.day_number)
      when t.job_id=7 then format('Synthetic claim CLM-%s totals $%s. Coverage appears active, but the service date differs from the fictional encounter record by one day. No real patient information is used.',7000+t.day_number,180+t.day_number*5)
      when t.job_id=8 then format('Practice employee E-%s reports %s hours at $%s per hour. The practice rule pays hours over 40 at 1.5x; a $%s deduction is approved, but timesheet approval is %s.',200+t.day_number,38+(t.day_number%12),18+(t.day_number%5),25+t.day_number,case when t.day_number%2=1 then 'pending' else 'recorded' end)
      when t.job_id=9 then format('Mock bank line BL-%s is $%s and appears to match invoice INV-%s; a similar ledger posting is dated one day later.',500+t.day_number,to_char(120.5+t.day_number*7.25,'FM999999990.00'),900+t.day_number)
      when t.job_id=10 then format('Synthetic encounter EC-%s mentions a diagnosis, but the narrative does not include all specificity needed to support a confident code choice. No authoritative code reference is supplied; flag what must be clarified instead of guessing.',300+t.day_number)
    end as scenario,
    case
      when t.job_id=1 then 'I would review the overdue queue, repeat-contact rate and quality score against the target, identify the highest-risk issue, assign an owner and deadline, then track follow-up in the dashboard. I would verify the underlying records, document the decision, protect customer data, and review results at the next team huddle.'
      when t.job_id in (6,11) then 'I would acknowledge the customer concern, verify the order record and policy before promising a remedy, explain the next action in plain language, document the case, and set a follow-up deadline. I would escalate if the case exceeds policy and avoid including unnecessary personal data.'
      when t.job_id in (2,4,5,12) then 'I would preserve the original file, normalize date formats, flag duplicates and missing fields rather than guessing, verify corrections against the source record, log changes and owners, and send a concise status update before the deadline.'
      when t.job_id=3 then 'I would confirm the prospect goals, timeline and budget, map a relevant product benefit to the need without overpromising, acknowledge the objection, record the CRM next step, and schedule a follow-up with a clear owner and date.'
      when t.job_id=7 then 'I would compare the claim fields against the synthetic eligibility and service record, flag missing or inconsistent information, avoid changing codes or coverage without documentation, protect patient information, and route the exception to an authorized billing reviewer before resubmission.'
      when t.job_id=8 then 'I would verify approved hours and pay rate, calculate regular and overtime hours under the stated practice policy, check approved deductions, reconcile gross and net totals, and hold the item for approval if timesheet or employee details are incomplete.'
      when t.job_id=9 then 'I would match the transaction to the invoice and bank line, confirm amount, date and vendor, check for duplicate postings, record any correction with an audit trail, and escalate unresolved differences before closing the period.'
      when t.job_id=10 then 'I would compare the documentation with the supplied coding reference, verify that required specificity and support are present, flag unsupported or conflicting details rather than guessing a code, protect patient confidentiality, and send a compliant query to a qualified reviewer.'
    end as reference_answer
  from public.job_task_templates t
  where t.is_published=true and t.day_number between 1 and 20
)
update public.job_task_templates t
set instructions=case
  when position('Fictional scenario:' in t.instructions)>0 then t.instructions
  else t.instructions || E'\n\nFictional scenario: ' || s.scenario || E'\n\nExpected deliverable: provide a structured response with steps, a decision or output, an accuracy/privacy check, and the next action.'
end,
updated_at=now()
from scenarios s where t.id=s.id;

update private.job_task_answer_keys k
set reference_answer='For "'||t.title||'", '||s.reference_answer||' This is a training example only; use fictional data and follow the documented policy for this role.',
    updated_at=now()
from public.job_task_templates t
join scenarios s on s.id=t.id
where k.task_template_id=t.id;

create or replace function public.remote_way_get_task_answer_key(p_template_id bigint)
returns jsonb
language sql
security definer
set search_path=public,private,pg_temp
as $$
  select jsonb_build_object('required_keywords',k.required_keywords,'minimum_words',k.minimum_words,'rubric',k.rubric,'reference_answer',k.reference_answer)
  from private.job_task_answer_keys k
  join public.job_task_templates t on t.id=k.task_template_id
  where k.task_template_id=p_template_id and t.is_published=true
$$;
revoke all on function public.remote_way_get_task_answer_key(bigint) from public,anon,authenticated;
grant execute on function public.remote_way_get_task_answer_key(bigint) to service_role;
