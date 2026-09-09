-- Roster do time de atendimento gerenciável pela guia Admin.
-- A tabela `agents` passa a ser a lista de quem PODE acessar o painel:
-- ter uma linha = ter acesso. Sem linha, nem o link de verificação é enviado.
-- Rode no SQL Editor do Supabase DEPOIS do 004_senha_atendente.sql.

-- quem administra o roster (vê a guia Admin e cadastra/remove pessoas)
alter table agents add column if not exists is_admin   boolean not null default false;
-- rastro de quem convidou (auditoria)
alter table agents add column if not exists invited_by text;

-- o roster é consultado a cada pedido de link/login
create index if not exists agents_is_admin_idx on agents (is_admin) where is_admin;
