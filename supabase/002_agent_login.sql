-- Login dos atendentes por e-mail + código de acesso.
-- Rode no SQL Editor do Supabase DEPOIS do schema.sql.

create extension if not exists "pgcrypto";

-- =====================================================================
-- atendentes (criado no primeiro login válido)
-- =====================================================================
create table if not exists agents (
  email         text primary key,
  name          text not null,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- =====================================================================
-- códigos de acesso de uso único
-- O código NUNCA é gravado em texto puro — só o hash. Um vazamento do
-- banco não dá acesso ao painel.
-- =====================================================================
create table if not exists agent_login_codes (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  code_hash  text not null,
  expires_at timestamptz not null,
  attempts   int not null default 0,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists agent_login_codes_email_idx
  on agent_login_codes (email, created_at desc);

alter table agents            enable row level security;
alter table agent_login_codes enable row level security;

-- =====================================================================
-- limpeza: códigos vencidos não precisam ficar guardados
-- =====================================================================
create or replace function purge_expired_login_codes() returns void as $$
  delete from agent_login_codes where expires_at < now() - interval '1 day';
$$ language sql;
