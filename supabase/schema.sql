-- Beeno Help Center — suporte humano (fila + chat ao vivo + tickets offline)
-- Rode este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

-- =====================================================================
-- conversas
-- =====================================================================
create table if not exists conversations (
  id              uuid primary key default gen_random_uuid(),
  -- bot     : conversando só com a IA
  -- waiting : cliente pediu humano, aguardando um atendente assumir
  -- live    : atendente assumiu, chat ao vivo
  -- offline : ticket aberto fora do horário, retorno por e-mail
  -- closed  : encerrada
  status          text not null default 'bot'
                  check (status in ('bot','waiting','live','offline','closed')),
  visitor_name    text,
  visitor_email   text,
  subject         text,
  agent_name      text,
  -- motivo/pergunta que originou o pedido de humano
  handoff_reason  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  handoff_at      timestamptz,
  closed_at       timestamptz,
  -- throttle do aviso no WhatsApp: evita spamar o grupo quando o cliente
  -- manda várias mensagens seguidas antes de alguém assumir
  last_notified_at timestamptz
);

-- =====================================================================
-- mensagens
-- =====================================================================
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  -- user      : visitante
  -- assistant : IA
  -- agent     : atendente humano
  -- system    : avisos automáticos ("transferindo...", "atendimento encerrado")
  role            text not null check (role in ('user','assistant','agent','system')),
  content         text not null,
  author_name     text,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on messages (conversation_id, created_at);

create index if not exists conversations_status_idx
  on conversations (status, last_message_at desc);

-- =====================================================================
-- mantém last_message_at / updated_at em dia
-- =====================================================================
create or replace function touch_conversation() returns trigger as $$
begin
  update conversations
     set last_message_at = new.created_at,
         updated_at      = now()
   where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists messages_touch_conversation on messages;
create trigger messages_touch_conversation
  after insert on messages
  for each row execute function touch_conversation();

-- =====================================================================
-- RLS: nenhum acesso pelo anon key.
-- Todo acesso passa pelas rotas /api do servidor, que usam a service_role
-- key (a service_role ignora RLS por padrão).
-- =====================================================================
alter table conversations enable row level security;
alter table messages      enable row level security;
