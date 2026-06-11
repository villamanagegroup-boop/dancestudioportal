-- Populate first/last name from OAuth metadata (Google) on signup.
-- Password signups send first_name/last_name in metadata; Google OAuth instead
-- sends given_name / family_name / full_name (+ name). Extend handle_new_user()
-- to fall back to those so a Google signup doesn't land with a blank name.
-- Replaces the function the existing on_auth_user_created trigger points to.
-- Idempotent. Safe to re-run.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  fn text;
  ln text;
begin
  fn := coalesce(
    nullif(meta->>'first_name', ''),
    meta->>'given_name',
    nullif(split_part(coalesce(meta->>'full_name', meta->>'name', ''), ' ', 1), ''),
    ''
  );
  ln := coalesce(
    nullif(meta->>'last_name', ''),
    meta->>'family_name',
    ''
  );

  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    fn,
    ln,
    coalesce((meta->>'role')::public.user_role, 'parent')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

insert into applied_migrations (filename) values ('oauth_user_names.sql') on conflict (filename) do nothing;
