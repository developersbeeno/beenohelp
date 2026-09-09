# Atendimento humano — Beeno Help Center

Como funciona o fluxo que leva o cliente da IA até um consultor.

## Fluxo

```
Cliente conversa com a IA
        │
        ├── resolveu → fim
        │
        └── "Não resolveu? Falar com um consultor"
                │
                ├── formulário: nome + e-mail de acesso + dúvida
                │
                ├── DENTRO do horário (seg–sex, 9h–18h)
                │      status = waiting
                │      → aviso no grupo do WhatsApp (n8n) com link do painel
                │      → consultor abre /atendimento, clica em "Assumir"
                │      → status = live, chat ao vivo nos dois lados
                │
                └── FORA do horário
                       status = offline
                       → aviso no WhatsApp marcado como recado
                       → time responde por e-mail depois
```

O widget só oferece atendimento humano quando `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` e `N8N_SUPPORT_WEBHOOK_URL` estão configurados.
Sem isso, o site funciona só com a IA, como antes.

## Setup

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (free tier serve).
2. **SQL Editor** → cole e rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. **Project Settings → API** → copie a `Project URL` e a `service_role` key.

### 2. Variáveis de ambiente na Vercel

```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add AGENT_PASSWORD production
vercel env add AGENT_SESSION_SECRET production
vercel env add N8N_SUPPORT_WEBHOOK_URL production
vercel env add PUBLIC_SITE_URL production
```

Veja [`.env.example`](.env.example) para a lista completa e os valores padrão.

### 3. Webhook do n8n (aviso no WhatsApp)

Crie um workflow com um nó **Webhook** (POST) e ligue num nó que poste no grupo
interno. O payload que enviamos:

```jsonc
{
  "event": "handoff_waiting",      // ou "offline_ticket" | "visitor_reply"
  "conversation_id": "uuid",
  "visitor_name": "Maria Silva",
  "visitor_email": "maria@empresa.com",
  "question": "Não consigo importar meus contatos",
  "transcript": "Cliente: ...\nIA: ...",   // últimas mensagens, contexto
  "panel_url": "https://help.beeno.ai/atendimento?c=uuid",
  "business_hours": true,
  "created_at": "2026-08-05T14:03:00.000Z"
}
```

Os três eventos:

| `event`           | Quando                                              | Gera e-mail? |
| ----------------- | --------------------------------------------------- | --- |
| `handoff_waiting` | Cliente pediu humano dentro do horário — tem gente esperando | ✅ |
| `offline_ticket`  | Cliente deixou recado fora do horário — responder por e-mail | ✅ |
| `visitor_reply`   | Cliente mandou outra mensagem e ninguém assumiu ainda | ❌ |

O payload leva `recipients`: os e-mails de **todo o roster**, resolvidos pelo
servidor (o n8n não precisa de credencial do banco).

### Workflow no n8n

`Beeno Help Center — Aviso de novo atendimento (e-mail para o time)`
(id `ZOWCqWzAaX7oYYyY`) — webhook `beeno-help-novo-atendimento`.

`Webhook → Valida e monta e-mail → É atendimento novo? → Gmail → Responder OK`

O nó de validação exige `Authorization: Bearer <N8N_SUPPORT_WEBHOOK_TOKEN>`,
recusa destinatário fora dos domínios corporativos, recusa `panel_url` que não
aponte para `help.beeno.ai`, e **descarta `visitor_reply`** — só atendimento
novo vira e-mail. O nó IF é a segunda barreira: eventos ignorados desviam do
Gmail e respondem OK direto.

Dupla proteção contra spam: além do filtro no n8n, o servidor só chama
`notifyTeam` com `visitor_reply` quando a conversa está em `waiting`, e ainda
com throttle de 5 minutos.

## Painel do atendente

`https://help.beeno.ai/atendimento`

### Login

**Primeiro acesso** por link de verificação; **depois**, e-mail + senha própria.

1. O atendente digita o e-mail e clica em "Primeiro acesso"
2. Recebe um e-mail com um botão de verificação (link válido por 30 min, uso único)
3. Ao clicar, entra autenticado e define uma senha
4. Nas próximas vezes: e-mail + senha, direto
5. "Esqueci minha senha" reenvia o link, agora pedindo uma senha nova

Quem entra é decidido por `AGENT_ALLOWED_DOMAINS` (hoje `beeno.ai,skeps.com.br`).
Como `skeps.com.br` é a empresa inteira, use `AGENT_ALLOWED_EMAILS` (lista de
e-mails específicos) para restringir só aos atendentes de fato — se preenchida,
ela tem prioridade sobre o domínio. Ambas mudam sem deploy.

O nome que o cliente vê é derivado do e-mail
(`vitor.gutierrez@beeno.ai` → "Vitor Gutierrez") e guardado na tabela `agents`.

Proteções: senha em **PBKDF2-SHA256 (210k iterações + salt por atendente)**,
nunca em texto puro; token do link guardado só como hash, uso único e atômico
(a prova de corrida), expira em 30 min; `AGENT_SESSION_SECRET` é obrigatória em
produção (sem ela a autenticação é desabilitada, não há fallback).

O payload que o webhook `N8N_AGENT_CODE_WEBHOOK_URL` recebe:

```json
{
  "event": "agent_login_link",
  "to": "vitor.gutierrez@beeno.ai",
  "name": "Vitor Gutierrez",
  "link": "https://help.beeno.ai/atendimento?token=...",
  "expires_minutes": 30,
  "is_reset": false,
  "requested_at": "2026-08-07T12:00:00.000Z"
}
```

O nó "Valida e monta e-mail" do n8n exige o header `x-otp-secret`
(= `N8N_AGENT_CODE_SECRET`), só envia para os domínios corporativos e recusa
link que não aponte para `help.beeno.ai`.

### Guia "Atendimentos"

- **Assumir** — pega a conversa (o cliente vê "Fulano entrou no atendimento")
- **Encerrar** — fecha o atendimento
- Responder já assume a conversa automaticamente
- A aba do navegador mostra `(N)` no título quando tem gente na fila

### Guia "Métricas"

Filtro de período (7 / 30 / 90 dias) no topo, valendo para tudo abaixo:

| Métrica | O que responde |
| --- | --- |
| Conversas no período | volume total de uso do help center |
| **Resolvido só pela IA** | % que a IA fechou sozinha — mede se a base de artigos está boa |
| Tempo até 1ª resposta | média + mediana entre o pedido e o primeiro "oi" humano |
| Tempo de resolução | do pedido até o encerramento |
| Volume por dia | coluna empilhada: IA vs escaladas |
| Escalonamentos por hora | onde está o pico — ajuda a dimensionar plantão |
| Atendimentos por consultor | distribuição de carga no time |

Todo gráfico tem "Ver dados em tabela" para leitura sem depender de cor.

A paleta foi validada com o validador de contraste/daltonismo contra as
superfícies reais do tema (`#ffffff` claro, `#090d16` escuro) — todos os
checks passam nos dois modos.

## Notas técnicas

- **Sem Realtime:** as mensagens sincronizam por polling (3s no chat, 5s na
  lista). Todo acesso ao banco passa pelas rotas `/api` usando a `service_role`
  key no servidor — o browser nunca fala com o Supabase direto, então não há
  chave exposta nem risco de RLS mal configurada vazar conversas.
- **Identidade do visitante:** um UUID em `localStorage` (`beeno_conversation_id`).
  Limpar o storage começa uma conversa nova.
- **Horário:** calculado no servidor com `Intl.DateTimeFormat` no fuso de
  `SUPPORT_TZ`, independente do fuso em que a função roda.
