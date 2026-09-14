import { createFileRoute } from "@tanstack/react-router";

import { corsHeaders, preflight } from "@/lib/cors.server";
import { signAttachments, supabaseAdmin, supabaseConfigured } from "@/lib/supabase.server";

// O widget comercial roda no beeno.ai (outra origem), então as respostas
// precisam ecoar os headers de CORS quando a origem está na allowlist.
const json = (request: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...corsHeaders(request) },
  });

/**
 * O visitante pergunta "chegou algo novo?".
 * Devolve só o que ele ainda não tem: mensagens do atendente e do sistema.
 */
export const Route = createFileRoute("/api/support/poll")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),

      GET: async ({ request }) => {
        try {
          if (!supabaseConfigured()) return json(request, { status: "bot", messages: [] });

          const url = new URL(request.url);
          const id = url.searchParams.get("conversation_id");
          const after = url.searchParams.get("after");
          if (!id) return json(request, { error: "conversation_id obrigatório" }, 400);

          const db = supabaseAdmin();

          // agent_avatar veio na migration 007. Se ela ainda não rodou, o
          // PostgREST devolve erro de coluna inexistente — e o chat não pode
          // parar por causa de uma foto, então relemos sem ela.
          let { data: conv } = await db
            .from("conversations")
            .select("status, agent_name, agent_avatar")
            .eq("id", id)
            .maybeSingle();

          if (!conv) {
            const { data: basico } = await db
              .from("conversations")
              .select("status, agent_name")
              .eq("id", id)
              .maybeSingle();
            conv = basico ? { ...basico, agent_avatar: null } : null;
          }

          if (!conv) return json(request, { status: "bot", messages: [] });

          let q = db
            .from("messages")
            .select("id, role, content, author_name, attachments, created_at")
            .eq("conversation_id", id)
            .in("role", ["agent", "system"])
            .order("created_at", { ascending: true })
            .limit(50);

          if (after) q = q.gt("created_at", after);

          const { data: messages } = await q;

          return json(request, {
            status: conv.status,
            agent_name: conv.agent_name,
            agent_avatar: conv.agent_avatar ?? null,
            messages: await signAttachments(messages || []),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json(request, { error: msg }, 500);
        }
      },
    },
  },
});
