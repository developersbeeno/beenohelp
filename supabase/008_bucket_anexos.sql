-- Bucket de anexos (prints colados com Ctrl+V, arquivos, áudio de visitante
-- e atendente). Rode no SQL Editor do Supabase depois do 007.
--
-- Faltava — o código sempre assumiu que ele existia (ver
-- src/lib/supabase.server.ts, BUCKET = "support-uploads"), mas nenhuma
-- migration criava ele. Sem isso todo upload falhava com "Bucket not
-- found" (inclusive o Ctrl+V de print no painel do atendente).
--
-- PRIVADO, ao contrário do de fotos de atendente (007): o acesso é só por
-- link assinado (ver /api/support/upload e como os anexos são exibidos).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-uploads',
  'support-uploads',
  false,
  4194304, -- 4 MB, mesmo limite de MAX_UPLOAD_BYTES em supabase.server.ts
  array[
    'image/png','image/jpeg','image/gif','image/webp',
    'application/pdf','text/plain','text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav'
  ]
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
