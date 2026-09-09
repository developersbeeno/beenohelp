-- Login do atendente: primeiro acesso por link de verificação,
-- depois e-mail + senha própria.
-- Rode no SQL Editor do Supabase DEPOIS do 002_agent_login.sql.

-- Senha NUNCA é gravada em texto puro: guardamos o hash PBKDF2-SHA256
-- e o salt aleatório de cada atendente.
alter table agents add column if not exists password_hash   text;
alter table agents add column if not exists password_salt   text;
alter table agents add column if not exists password_set_at timestamptz;

-- A mesma tabela guarda os dois tipos de credencial temporária:
--   'link' = token do e-mail de verificação / redefinição de senha
--   'code' = código de 6 dígitos (fluxo antigo, mantido só por compatibilidade)
alter table agent_login_codes
  add column if not exists kind text not null default 'link';

-- busca do token de link é feita pelo hash
create index if not exists agent_login_codes_hash_idx
  on agent_login_codes (code_hash);
