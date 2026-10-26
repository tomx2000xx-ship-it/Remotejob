alter table public.job_workspace_access add column if not exists network_requirement_exempt boolean not null default false;
