alter table public.job_network_profiles drop constraint if exists job_network_connection_type_length;
alter table public.job_network_profiles
  add constraint job_network_connection_type_length
  check (char_length(trim(both from connection_type)) <= 80);
