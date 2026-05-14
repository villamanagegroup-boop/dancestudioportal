-- ============================================================
-- Fix: "Database error creating new user"
-- handle_new_user() ran without a search_path, so when the auth
-- trigger fired it couldn't resolve the public.profiles table or
-- the public.user_role type. Recreate it schema-qualified with an
-- explicit search_path. Safe to run anytime; replaces the function
-- the existing on_auth_user_created trigger already points to.
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'parent')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
