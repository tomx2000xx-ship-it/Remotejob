-- Allow active administrators to read member profile rows for admin management screens.
-- The private.is_admin() helper checks the signed-in user's database role.
create policy "profiles_admin_select_all"
on public.profiles
for select
to authenticated
using ((select private.is_admin()));
