-- ============================================================
-- PayPal vaulting: extend payment_methods to store PayPal vault
-- tokens so families can save cards for reuse. Idempotent.
-- ============================================================

alter table payment_methods
  add column if not exists provider text not null default 'stripe',
  add column if not exists paypal_customer_id text,
  add column if not exists paypal_token_id text;

alter table payment_methods drop constraint if exists payment_methods_provider_check;
alter table payment_methods add constraint payment_methods_provider_check
  check (provider in ('stripe', 'paypal'));

create index if not exists payment_methods_guardian_provider
  on payment_methods(guardian_id, provider);

-- RLS: guardians read/manage their own saved methods (in case not already set)
alter table payment_methods enable row level security;

drop policy if exists "guardians_own_payment_methods" on payment_methods;
create policy "guardians_own_payment_methods" on payment_methods for all
  using (guardian_id = auth.uid());

drop policy if exists "admins_all_payment_methods" on payment_methods;
create policy "admins_all_payment_methods" on payment_methods for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
