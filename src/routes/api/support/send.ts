import { createFileRoute } from "@tanstack/react-router";
import {
  insertMessage,
  sanitizeAttachments,
  supabaseAdmin,
  supabaseConfigured,
} from "@/lib/supabase.server";
import { notifyTeam, panelUrl } from "@/lib/support.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** Mensagem do visitante enquanto a conversa está com um humano (fila ou ao vivo). */
export const Route = createFileRoute("/api/support/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!supabaseConfigured()) return json({ error: "Suporte indisponível." }, 503);

          const { conversation_id, content, attachments } = (await request.json()) as {
            conversation_id?: string;
            content?: string;
            attachments?: unknown;
          };

          const id = (conversation_id || "").trim();
          const text = (content || "").trim().slice(0, 4000);
          const files = sanitizeAttachments(attachments, id);
          // mensagem só com anexo é válida
          if (!id || (!text && !files.length)) return json({ error: "Dados incompletos" }, 400);

          const db = supabaseAdmin();
          const { data: conv } = await db
            .from("conversations")
            .select("status, visitor_name, visitor_email, last_notified_at")
            .eq("id", id)
            .maybeSingle();

          if (!conv) return json({ error: "Conversa não encontrada" }, 404);
          if (conv.status === "closed") return json({ error: "Atendimento encerrado" }, 409);

          const msg = await insertMessage(
            id,
            "user",
            text || `📎 ${files.length} arquivo(s) enviado(s)`,
            null,
            files,
          );

          // Se ainda ninguém assumiu, reforça o aviso no grupo do WhatsApp —
          // no máximo uma vez a cada 5min, para não spamar o grupo.
          const QUIET_MS = 5 * 60 * 1000;
          const lastNotified = conv.last_notified_at ? Date.parse(conv.last_notified_at) : 0;
          if (conv.status === "waiting" && Date.now() - lastNotified > QUIET_MS) {
            await db
              .from("conversations")
              .update({ last_notified_at: new Date().toISOString() })
              .eq("id", id);

            await notifyTeam({
              event: "visitor_reply",
              conversation_id: id,
              visitor_name: conv.visitor_name,
              visitor_email: conv.visitor_email,
              question: text,
              transcript: null,
              panel_url: panelUrl(id),
              business_hours: true,
              created_at: new Date().toISOString(),
            });
          }

          return json({ ok: true, id: msg?.id });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
