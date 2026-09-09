-- Anexos nas mensagens (prints e arquivos enviados pelo cliente ou atendente).
-- Rode no SQL Editor do Supabase.

-- [{ "path": "...", "name": "print.png", "type": "image/png", "size": 12345 }]
alter table messages add column if not exists attachments jsonb;

-- busca do histórico por nome/e-mail/assunto
create index if not exists conversations_visitor_email_idx on conversations (visitor_email);
create index if not exists conversations_created_idx      on conversations (created_at desc);
