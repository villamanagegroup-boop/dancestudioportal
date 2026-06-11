-- Notify admins when a new family self-signs up (email OR Google OAuth).
-- Fires AFTER INSERT on profiles for role='parent' and writes a notifications
-- row, so a new self-signup shows up in the admin bell. This is the visibility
-- guardrail for open sign-up.
--
-- Defensive: guarded by to_regclass so it's a no-op until notifications exists
-- (run notifications_module.sql first), and wrapped in exception handling so a
-- notification failure can NEVER block account creation.
-- Idempotent. Safe to re-run.

create or replace function notify_admin_new_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'parent' and to_regclass('public.notifications') is not null then
    begin
      insert into public.notifications (audience, type, title, body, href, metadata, tenant_id)
      values (
        'admin',
        'account.created',
        'New account',
        coalesce(nullif(trim(coalesce(new.first_name, '') || ' ' || coalesce(new.last_name, '')), ''), new.email),
        '/families/' || new.id,
        jsonb_build_object('profile_id', new.id, 'email', new.email),
        new.tenant_id
      );
    exception when others then
      null; -- never block signup on a notification failure
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_notify_new_account on profiles;
create trigger profiles_notify_new_account
  after insert on profiles
  for each row execute function notify_admin_new_account();

insert into applied_migrations (filename) values ('notify_on_signup.sql') on conflict (filename) do nothing;
