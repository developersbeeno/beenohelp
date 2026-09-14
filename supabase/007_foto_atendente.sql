-- Foto do atendente/consultor — aparece no chat, ao lado do nome de quem
-- está respondendo. Rode no SQL Editor do Supabase depois do 006.

-- =====================================================================
-- a foto fica no perfil do atendente (uma por pessoa)
-- =====================================================================
alter table agents add column if not exists avatar_url text;

-- =====================================================================
-- quem assumiu a conversa
--   agent_email  : chave de agents, permite saber de quem é o atendimento
--   agent_avatar : cópia da foto no momento em que assumiu
--
-- A foto é copiada de propósito: o widget faz polling de poucos em poucos
-- segundos e, sem a cópia, cada poll viraria um join a mais em `agents`.
-- Trocar a foto atualiza também as conversas em andamento (ver
-- /api/agent/avatar), então na prática nunca fica desatualizada.
-- =====================================================================
alter table conversations add column if not exists agent_email text;
alter table conversations add column if not exists agent_avatar text;

-- =====================================================================
-- bucket das fotos — PÚBLICO, ao contrário do de anexos
--
-- A foto precisa carregar no widget hospedado em beeno.ai sem link
-- assinado (que expira e obrigaria a re-assinar a cada poll). É uma foto
-- de perfil profissional, o mesmo que já vai no e-mail e no LinkedIn —
-- não há dado sensível aqui. O nome do arquivo é aleatório mesmo assim.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent-avatars',
  'agent-avatars',
  true,
  2097152, -- 2 MB
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
