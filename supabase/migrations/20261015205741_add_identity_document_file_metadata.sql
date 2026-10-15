alter table public.verification_documents
  add column if not exists original_file_name text,
  add column if not exists mime_type text;
