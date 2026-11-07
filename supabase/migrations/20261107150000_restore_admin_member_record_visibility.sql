-- Restore admin/super-admin read access to existing member-linked records.
-- SELECT-only policies; no table, column, or workflow changes.
do $$
declare t text;
begin
  foreach t in array array[
    'saved_jobs',
    'interviews',
    'interview_answers',
    'job_workspace_access',
    'point_orders',
    'point_transactions',
    'point_wallets'
  ] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', 'admins read member records', t);
      execute format(
        'create policy %I on public.%I for select to authenticated using (private.is_admin())',
        'admins read member records', t
      );
    end if;
  end loop;
end $$;
