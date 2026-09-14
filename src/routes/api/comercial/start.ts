import { createFileRoute } from "@tanstack/react-router";

import { jsonCors, preflight } from "@/lib/cors.server";
import { criarLeadComercial } from "@/lib/crm.server";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase.server";
import {
  businessHoursLabel,
  isBusinessHours,
  notifyTeam,
  panelUrl,
} from "@/lib/support.server";

/**
 * Abre um atendimento da fila comercial.
 *
 * Diferente do help center, aqui não há IA na frente: dentro do horário o
 * visitante já entra na fila de um consultor. As perguntas de qualificação
 * existem para criar o lead no CRM, não para filtrar quem fala com o time.
 */

type Body = {
  conversation_id?: string;
  nome?: string;
  email?: string;
  telefone?: string;
  empresa?: string;
  assunto?: string;
  source_url?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const Route = createFileRoute("/api/comercial/start")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),

      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Body;

          const conversationId = (body.conversation_id || "").trim();
          const nome = (body.nome || "").trim().slice(0, 120);
          const email = (body.email || "").trim().toLowerCase().slice(0, 200);
          const telefone = (body.telefone || "").trim().slice(0, 40);
          const empresa = (body.empresa || "").trim().slice(0, 160) || null;
          const assunto = (body.assunto || "").trim().slice(0, 2000) || null;
          const sourceUrl = (body.source_url || "").trim().slice(0, 500) || null;

          if (!conversationId) return jsonCors(request, { error: "conversation_id obrigatório" }, 400);
          if (nome.length < 2) return jsonCors(request, { error: "Informe o seu nome." }, 400);
          if (!EMAIL_RE.test(email)) return jsonCors(request, { error: "Informe um e-mail válido." }, 400);
          if (telefone.replace(/\D/g, "").length < 10)
            return jsonCors(request, { error: "Informe um telefone com DDD." }, 400);

          const aberto = isBusinessHours();
          // Dentro do horário entra na fila de gente; fora, vira recado.
          const status = aberto ? "waiting" : "offline";

          if (!supabaseConfigured()) {
            // Sem banco, ao menos não perde o lead: CRM + aviso ao time.
            const { dealId } = await criarLeadComercial({
              nome, email, telefone, empresa, assunto, origemUrl: sourceUrl,
            });
            await notifyTeam({
              event: aberto ? "handoff_waiting" : "offline_ticket",
              queue: "comercial",
              conversation_id: conversationId,
              visitor_name: nome,
              visitor_email: email,
              question: assunto,
              transcript: null,
              panel_url: panelUrl(conversationId),
              business_hours: aberto,
              created_at: new Date().toISOString(),
            });
            return jsonCors(request, {
              mode: "offline",
              business_hours_label: businessHoursLabel(),
              crm_deal_id: dealId,
              message:
                "Recebemos o seu contato! Um consultor responde no e-mail informado.",
            });
          }

          const db = supabaseAdmin();
          const agora = new Date().toISOString();

          // Upsert: o visitante pode reabrir o widget com o mesmo id.
          const { error: convErr } = await db.from("conversations").upsert(
            {
              id: conversationId,
              queue: "comercial",
              status,
              visitor_name: nome,
              visitor_email: email,
              visitor_company: empresa,
              visitor_phone: telefone,
              subject: assunto,
              handoff_reason: assunto,
              source_url: sourceUrl,
              handoff_at: agora,
              last_message_at: agora,
            },
            { onConflict: "id" },
          );
          if (convErr) {
            console.error("[comercial] upsert da conversa:", convErr.message);
            return jsonCors(request, { error: "Não foi possível abrir o atendimento." }, 500);
          }

          // Primeira mensagem: o contexto que o consultor lê antes de responder.
          await db.from("messages").insert({
            conversation_id: conversationId,
            role: "user",
            content:
              assunto ||
              `${nome}${empresa ? ` (${empresa})` : ""} quer falar com um consultor.`,
            author_name: nome,
          });

          await db.from("messages").insert({
            conversation_id: conversationId,
            role: "system",
            content: aberto
              ? "Você está na fila. Um consultor entra na conversa em instantes."
              : `Estamos fora do horário de atendimento (${businessHoursLabel()}). Um consultor responde no e-mail informado.`,
          });

          // CRM depois de a conversa existir: se o CRM cair, o atendimento
          // continua de pé e o lead pode ser reprocessado.
          const { dealId } = await criarLeadComercial({
            nome, email, telefone, empresa, assunto, origemUrl: sourceUrl,
          });
          if (dealId) {
            await db.from("conversations").update({ crm_deal_id: dealId }).eq("id", conversationId);
          }

          await notifyTeam({
            event: aberto ? "handoff_waiting" : "offline_ticket",
            queue: "comercial",
            conversation_id: conversationId,
            visitor_name: nome,
            visitor_email: email,
            question: [empresa ? `Empresa: ${empresa}` : null, `Telefone: ${telefone}`, assunto]
              .filter(Boolean)
              .join(" · "),
            transcript: null,
            panel_url: panelUrl(conversationId),
            business_hours: aberto,
            created_at: agora,
          });

          return jsonCors(request, {
            mode: aberto ? "live" : "offline",
            status,
            business_hours_label: businessHoursLabel(),
            crm_deal_id: dealId,
            message: aberto
              ? "Tudo certo! Você está na fila — um consultor entra na conversa em instantes."
              : `Recebemos o seu contato. Estamos fora do horário (${businessHoursLabel()}) e um consultor responde no e-mail informado.`,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          console.error("[comercial] start:", msg);
          return jsonCors(request, { error: "Erro ao abrir o atendimento." }, 500);
        }
      },
    },
  },
});
