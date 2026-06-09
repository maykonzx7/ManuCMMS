-- Amplia o bucket de uploads para anexos/documentos (até 15 MB, PDF e Office).
update storage.buckets
set
  file_size_limit = 15728640,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
where id = 'avatars';
