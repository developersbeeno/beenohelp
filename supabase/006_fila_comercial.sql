-- Fila comercial — chat de vendas do beeno.ai atendido no mesmo painel.
-- Rode no SQL Editor do Supabase, depois do schema.sql.

-- =====================================================================
-- de qual fila a conversa veio
--   suporte   : help center (comportamento atual, default)
--   comercial : widget "Fale com um consultor" do beeno.ai
-- =====================================================================
alter table conversations
  add column if not exists queue text not null default 'suporte'
  check (queue in ('suporte','comercial'));

-- dados de qualificação que só a fila comercial coleta. Ficam aqui (e não
-- só no CRM) para o consultor ver o contexto sem sair do painel, e para a
-- conversa sobreviver caso a chamada ao CRM falhe.
alter table conversations
  add column if not exists visitor_company text;
alter table conversations
  add column if not exists visitor_phone text;

-- id do negócio criado no Beeno CRM, quando a criação deu certo.
-- null = lead ainda não foi para o CRM (vale reprocessar).
alter table conversations
  add column if not exists crm_deal_id text;

-- a página onde o visitante clicou no botão — ajuda a saber o que converte.
alter table conversations
  add column if not exists source_url text;

-- o painel lista por fila + status; sem este índice a query varre a tabela.
create index if not exists conversations_queue_status_idx
  on conversations (queue, status, last_message_at desc);
