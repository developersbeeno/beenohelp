import { createFileRoute } from "@tanstack/react-router";
import { signAttachments, supabaseAdmin, supabaseConfigured } from "@/lib/supabase.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/**
 * O visitante pergunta "chegou algo novo?".
 * Devolve só o que ele ainda não tem: mensagens do atendente e do sistema.
 */
export const Route = createFileRoute("/api/support/poll")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          if (!supabaseConfigured()) return json({ status: "bot", messages: [] });

          const url = new URL(request.url);
          const id = url.searchParams.get("conversation_id");
          const after = url.searchParams.get("after");
          if (!id) return json({ error: "conversation_id obrigatório" }, 400);

          const db = supabaseAdmin();

          const { data: conv } = await db
            .from("conversations")
            .select("status, agent_name")
            .eq("id", id)
            .maybeSingle();

          if (!conv) return json({ status: "bot", messages: [] });

          let q = db
            .from("messages")
            .select("id, role, content, author_name, attachments, created_at")
            .eq("conversation_id", id)
            .in("role", ["agent", "system"])
            .order("created_at", { ascending: true })
            .limit(50);

          if (after) q = q.gt("created_at", after);

          const { data: messages } = await q;

          return json({
            status: conv.status,
            agent_name: conv.agent_name,
            messages: await signAttachments(messages || []),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
