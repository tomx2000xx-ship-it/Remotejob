-- Keep synthetic network-research submissions available to their owner and administrators only.
-- RLS policies remain the row-level authorization boundary:
-- candidates can read their own row; administrators can read all rows.
alter table public.job_network_profiles enable row level security;

revoke all on table public.job_network_profiles from public, anon;
revoke all on table public.job_network_profiles from authenticated;
grant select, insert, update on table public.job_network_profiles to authenticated;

-- service_role retains its existing server-side privileges and RLS bypass.
