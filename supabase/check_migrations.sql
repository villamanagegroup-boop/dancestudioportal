-- Migration status check for Dance Studio Portal.
-- These migrations are run by hand (no schema_migrations tracking table),
-- so we probe for the signature object each file creates.
-- Run in the Supabase SQL editor. Anything marked MISSING hasn't been applied.

with checks(sort, migration, signature, present) as (
  values
    (1,  'studio_operations.sql',          'table camps',                       (to_regclass('public.camps') is not null)),
    (2,  'checkout_module.sql',            'table checkout_links',              (to_regclass('public.checkout_links') is not null)),
    (3,  'checkout_links_recipient.sql',   'checkout_links.recipient_email col', exists(select 1 from information_schema.columns where table_schema='public' and table_name='checkout_links' and column_name='recipient_email')),
    (4,  'tuition_links_may2026.sql',      'tuition-may2026-* rows',            exists(select 1 from checkout_links where slug like 'tuition-may2026-%')),
    (5,  'account_invites_module.sql',     'table account_invites',             (to_regclass('public.account_invites') is not null)),
    (6,  'activities_partners_module.sql', 'table partners',                    (to_regclass('public.partners') is not null)),
    (7,  'partner_role_module.sql',        'user_role enum has ''partner''',    exists(select 1 from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='user_role' and e.enumlabel='partner')),
    (8,  'admin_documents_module.sql',     'table admin_documents',             (to_regclass('public.admin_documents') is not null)),
    (9,  'calendar_module.sql',            'table calendar_events',             (to_regclass('public.calendar_events') is not null)),
    -- Verify a signature COLUMN, not just the table: camp_registrations can
    -- pre-exist in a reduced form, and `create table if not exists` won't add
    -- the missing columns. (Burned us 2026-06-08 — see camp_registrations_columns_fix.sql.)
    (10, 'camp_module.sql',                'camp_registrations.amount_paid col', exists(select 1 from information_schema.columns where table_schema='public' and table_name='camp_registrations' and column_name='amount_paid')),
    (10.5,'camp_registrations_columns_fix.sql','camp_registrations.guardian_id nullable', exists(select 1 from information_schema.columns where table_schema='public' and table_name='camp_registrations' and column_name='guardian_id' and is_nullable='YES')),
    (11, 'class_module.sql',               'classes.billing_type col',          exists(select 1 from information_schema.columns where table_schema='public' and table_name='classes' and column_name='billing_type')),
    (12, 'communications_module.sql',      'communications.target_type col',    exists(select 1 from information_schema.columns where table_schema='public' and table_name='communications' and column_name='target_type')),
    (13, 'enrollment_module.sql',          'enrollments.archived col',          exists(select 1 from information_schema.columns where table_schema='public' and table_name='enrollments' and column_name='archived')),
    (14, 'extra_roles_module.sql',         'profiles.extra_roles col',          exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='extra_roles')),
    (15, 'family_module.sql',              'profiles.custom_fields col',        exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='custom_fields')),
    (16, 'fix_handle_new_user.sql',        'function handle_new_user()',        (to_regprocedure('public.handle_new_user()') is not null)),
    (17, 'instructor_portal_module.sql',   'table instructor_hours',            (to_regclass('public.instructor_hours') is not null)),
    (18, 'parent_portal.sql',              'policy guardians_own_documents',    exists(select 1 from pg_policies where policyname='guardians_own_documents')),
    (19, 'party_module.sql',               'table party_tasks',                 (to_regclass('public.party_tasks') is not null)),
    (20, 'paypal_vault_module.sql',        'payment_methods.paypal_token_id',   exists(select 1 from information_schema.columns where table_schema='public' and table_name='payment_methods' and column_name='paypal_token_id')),
    (21, 'profiles_active.sql',            'profiles.active col',               exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='active')),
    (22, 'settings_module.sql',            'table studio_settings',             (to_regclass('public.studio_settings') is not null)),
    (23, 'site_intake_module.sql',         'table site_intake',                 (to_regclass('public.site_intake') is not null)),
    (24, 'site_intake_phase3.sql',         'status check includes ''invited''', exists(select 1 from pg_constraint where conname='site_intake_status_check' and pg_get_constraintdef(oid) like '%invited%')),
    (25, 'staff_permissions_module.sql',   'instructors.staff_role col',        exists(select 1 from information_schema.columns where table_schema='public' and table_name='instructors' and column_name='staff_role')),
    (26, 'students_dob_optional.sql',      'students.date_of_birth nullable',   exists(select 1 from information_schema.columns where table_schema='public' and table_name='students' and column_name='date_of_birth' and is_nullable='YES'))
)
select
  migration,
  signature,
  case when present then 'PASS' else '❌ MISSING' end as status
from checks
order by sort;
