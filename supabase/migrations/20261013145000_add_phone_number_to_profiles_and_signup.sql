alter table public.profiles
  add column if not exists phone_number text;

comment on column public.profiles.phone_number is
  'User phone number in international format (E.164), collected during registration.';

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_account_type text;
  v_name text;
  v_phone text;
begin
  v_account_type := case
    when new.raw_user_meta_data ->> 'account_type' in ('job_seeker','employer')
      then new.raw_user_meta_data ->> 'account_type'
    else 'job_seeker'
  end;
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_phone := nullif(new.raw_user_meta_data ->> 'phone_number', '');

  insert into public.profiles (id, full_name, account_type, phone_number)
  values (new.id, v_name, v_account_type, v_phone)
  on conflict (id) do nothing;

  if v_account_type = 'employer' then
    insert into public.employer_profiles (id, company_name)
    values (new.id, nullif(v_name,''))
    on conflict (id) do nothing;
  end if;
  return new;
end;
$function$;
