import { createFileRoute } from "@tanstack/react-router";
import { requireAgent } from "@/lib/agent-auth.server";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/** Fila do painel: aguardando, ao vivo, tickets offline e encerrados recentes. */
export const Route = createFileRoute("/api/agent/conversations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireAgent(request);
          if (!session) return json({ error: "Não autenticado" }, 401);
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const url = new URL(request.url);
          const filter = url.searchParams.get("filter") || "open";

          const statuses =
            filter === "closed"
              ? ["closed"]
              : filter === "offline"
                ? ["offline"]
                : ["waiting", "live", "offline"];

          const { data, error } = await supabaseAdmin()
            .from("conversations")
            .select(
              "id, status, visitor_name, visitor_email, subject, agent_name, handoff_reason, created_at, last_message_at, handoff_at",
            )
            .in("status", statuses)
            .order("last_message_at", { ascending: false })
            .limit(100);

          if (error) return json({ error: error.message }, 500);

          return json({ conversations: data || [], agent: session.name });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
