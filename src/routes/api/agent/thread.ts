import { createFileRoute } from "@tanstack/react-router";
import { requireAgent } from "@/lib/agent-auth.server";
import {
  insertMessage,
  sanitizeAttachments,
  signAttachments,
  supabaseAdmin,
  supabaseConfigured,
} from "@/lib/supabase.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const Route = createFileRoute("/api/agent/thread")({
  server: {
    handlers: {
      /** Histórico completo (ou só o que chegou depois de `after`). */
      GET: async ({ request }) => {
        try {
          const session = await requireAgent(request);
          if (!session) return json({ error: "Não autenticado" }, 401);
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const url = new URL(request.url);
          const id = url.searchParams.get("id");
          const after = url.searchParams.get("after");
          if (!id) return json({ error: "id obrigatório" }, 400);

          const db = supabaseAdmin();

          const { data: conversation } = await db
            .from("conversations")
            .select("*")
            .eq("id", id)
            .maybeSingle();
          if (!conversation) return json({ error: "Conversa não encontrada" }, 404);

          let q = db
            .from("messages")
            .select("id, role, content, author_name, attachments, created_at")
            .eq("conversation_id", id)
            .order("created_at", { ascending: true })
            .limit(500);
          if (after) q = q.gt("created_at", after);

          const { data: messages } = await q;
          return json({ conversation, messages: await signAttachments(messages || []) });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },

      /** Resposta do atendente. */
      POST: async ({ request }) => {
        try {
          const session = await requireAgent(request);
          if (!session) return json({ error: "Não autenticado" }, 401);
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const { id, content, attachments } = (await request.json()) as {
            id?: string;
            content?: string;
            attachments?: unknown;
          };
          const convId = (id || "").trim();
          const text = (content || "").trim().slice(0, 4000);
          const files = sanitizeAttachments(attachments, convId);
          if (!convId || (!text && !files.length)) return json({ error: "Dados incompletos" }, 400);

          const db = supabaseAdmin();
          const { data: conv } = await db
            .from("conversations")
            .select("status")
            .eq("id", convId)
            .maybeSingle();
          if (!conv) return json({ error: "Conversa não encontrada" }, 404);

          // Responder já assume a conversa automaticamente.
          if (conv.status !== "live") {
            await db
              .from("conversations")
              .update({
                status: "live",
                agent_name: session.name,
                updated_at: new Date().toISOString(),
              })
              .eq("id", convId);
          }

          const msg = await insertMessage(
            convId,
            "agent",
            text || `📎 ${files.length} arquivo(s) enviado(s)`,
            session.name,
            files,
          );
          const [signed] = await signAttachments(msg ? [msg] : []);
          return json({ ok: true, message: signed ?? msg });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },

      /** Assumir ou encerrar o atendimento. */
      PATCH: async ({ request }) => {
        try {
          const session = await requireAgent(request);
          if (!session) return json({ error: "Não autenticado" }, 401);
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const { id, action } = (await request.json()) as {
            id?: string;
            action?: "claim" | "close" | "reopen";
          };
          const convId = (id || "").trim();
          if (!convId || !action) return json({ error: "Dados incompletos" }, 400);

          const db = supabaseAdmin();
          const now = new Date().toISOString();

          if (action === "claim") {
            await db
              .from("conversations")
              .update({ status: "live", agent_name: session.name, updated_at: now })
              .eq("id", convId);
            await insertMessage(
              convId,
              "system",
              `${session.name} entrou no atendimento. A partir de agora você fala com um consultor do Beeno.`,
            );
          } else if (action === "close") {
            await db
              .from("conversations")
              .update({ status: "closed", closed_at: now, updated_at: now })
              .eq("id", convId);
            await insertMessage(
              convId,
              "system",
              "Atendimento encerrado. Se precisar de algo mais, é só chamar novamente!",
            );
          } else if (action === "reopen") {
            await db
              .from("conversations")
              .update({ status: "live", agent_name: session.name, closed_at: null, updated_at: now })
              .eq("id", convId);
          }

          return json({ ok: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
