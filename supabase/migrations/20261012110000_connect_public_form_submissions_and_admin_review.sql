-- Allow administrators to retrieve submissions for review.
drop policy if exists "admins read form responses" on public.form_responses;
create policy "admins read form responses"
on public.form_responses
for select
to authenticated
using ((select private.is_admin()));

-- Published forms can receive responses from visitors, including signed-out visitors.
-- Signed-in responses are tied to the authenticated user; anonymous responses have user_id = null.
drop policy if exists "public submit published form responses" on public.form_responses;
create policy "public submit published form responses"
on public.form_responses
for insert
to anon, authenticated
with check (
  (user_id is null or user_id = (select auth.uid()))
  and exists (
    select 1
    from public.form_definitions f
    where f.id = form_responses.form_id
      and f.status = 'published'
  )
);
