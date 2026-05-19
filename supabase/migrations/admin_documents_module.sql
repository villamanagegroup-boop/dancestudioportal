-- ============================================================
-- Admin documents: file storage metadata. Files themselves go
-- in a Supabase Storage bucket named 'admin-docs'. Idempotent.
--
-- IMPORTANT: After running this SQL, also create the storage bucket:
--   Supabase Dashboard → Storage → New bucket → name: 'admin-docs'
--   → Public: OFF (keep private — only admins access via service role)
-- ============================================================

create table if not exists admin_documents (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  category     text not null default 'general'
    check (category in ('general', 'contract', 'legal', 'branding', 'finance', 'import', 'other')),
  description  text,
  file_path    text not null,
  file_size    bigint,
  mime_type    text,
  uploaded_by  uuid references profiles(id) on delete set null,
  uploaded_at  timestamptz not null default now()
);

create index if not exists admin_documents_category on admin_documents(category);
create index if not exists admin_documents_uploaded_at on admin_documents(uploaded_at desc);

alter table admin_documents enable row level security;

drop policy if exists "admins_all_documents" on admin_documents;
create policy "admins_all_documents" on admin_documents for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
