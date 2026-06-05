-- Bucket público para fotos de perfil (executar no SQL Editor do Supabase)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública (PostgreSQL não suporta CREATE POLICY IF NOT EXISTS)
drop policy if exists "avatars_public_read" on storage.objects;

create policy "avatars_public_read"
on storage.objects for select
using (bucket_id = 'avatars');

-- Upload/update/delete apenas via service role (backend)
-- Nenhuma policy de insert para authenticated — o backend usa service role.
