import { createFileRoute } from "@tanstack/react-router";
import { requireAgent } from "@/lib/agent-auth.server";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/** Escapa vírgula/parênteses que quebrariam o filtro `or` do PostgREST. */
function escapeForOr(term: string): string {
  return term.replace(/[,()\\*]/g, " ").trim();
}

/**
 * Histórico de atendimentos, com busca livre e filtros.
 * Só conversas que chegaram a virar chamado (handoff_at preenchido) —
 * conversas soltas com a IA não são "atendimentos".
 */
export const Route = createFileRoute("/api/agent/history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireAgent(request);
          if (!session) return json({ error: "Não autenticado" }, 401);
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const url = new URL(request.url);
          const q = escapeForOr((url.searchParams.get("q") || "").slice(0, 120));
          const status = url.searchParams.get("status") || "";
          const agent = (url.searchParams.get("agent") || "").slice(0, 80);
          const from = url.searchParams.get("from") || "";
          const to = url.searchParams.get("to") || "";
          const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));
          const perPage = 25;

          let query = supabaseAdmin()
            .from("conversations")
            .select(
              "id, status, visitor_name, visitor_email, subject, agent_name, handoff_reason, created_at, handoff_at, closed_at, last_message_at",
              { count: "exact" },
            )
            .not("handoff_at", "is", null);

          if (q) {
            query = query.or(
              `visitor_name.ilike.%${q}%,visitor_email.ilike.%${q}%,subject.ilike.%${q}%,handoff_reason.ilike.%${q}%`,
            );
          }
          if (status) query = query.eq("status", status);
          if (agent) query = query.eq("agent_name", agent);
          if (from) query = query.gte("created_at", `${from}T00:00:00Z`);
          if (to) query = query.lte("created_at", `${to}T23:59:59Z`);

          const { data, count, error } = await query
            .order("last_message_at", { ascending: false })
            .range(page * perPage, page * perPage + perPage - 1);

          if (error) return json({ error: error.message }, 500);

          // lista de consultores para o filtro
          const { data: agentRows } = await supabaseAdmin()
            .from("conversations")
            .select("agent_name")
            .not("agent_name", "is", null)
            .limit(1000);
          const agents = [
            ...new Set((agentRows || []).map((a) => a.agent_name as string)),
          ].sort();

          return json({
            conversations: data || [],
            total: count ?? 0,
            page,
            per_page: perPage,
            agents,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
