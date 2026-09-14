import { createFileRoute } from "@tanstack/react-router";
import { podeAtenderComercial, requireAgent } from "@/lib/agent-auth.server";
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

          // Fila: "suporte" (help center) ou "comercial" (widget do beeno.ai).
          // Sem o parâmetro, devolve as duas — o painel decide como agrupar.
          const queue = url.searchParams.get("queue");

          let q = supabaseAdmin()
            .from("conversations")
            .select(
              "id, status, queue, visitor_name, visitor_email, visitor_company, visitor_phone, subject, agent_name, handoff_reason, crm_deal_id, source_url, created_at, last_message_at, handoff_at",
            )
            .in("status", statuses);

          // Fila comercial é restrita: leads de venda não ficam visíveis
          // para todo o time de suporte.
          const veComercial = podeAtenderComercial(session.email);

          if (queue === "suporte" || queue === "comercial") {
            if (queue === "comercial" && !veComercial) {
              return json({ conversations: [], agent: session.name });
            }
            q = q.eq("queue", queue);
          } else if (!veComercial) {
            q = q.eq("queue", "suporte");
          }

          const { data, error } = await q
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
