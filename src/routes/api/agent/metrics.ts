import { createFileRoute } from "@tanstack/react-router";
import { requireAgent } from "@/lib/agent-auth.server";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

type ConvRow = {
  id: string;
  status: string;
  agent_name: string | null;
  created_at: string;
  handoff_at: string | null;
  closed_at: string | null;
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

const mean = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

/** Dia no fuso do atendimento (YYYY-MM-DD), não no fuso do servidor. */
const TZ = process.env.SUPPORT_TZ || "America/Sao_Paulo";
const dayKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
const hourOf = (iso: string) =>
  Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hour12: false })
      .format(new Date(iso))
      .replace(/\D/g, ""),
  ) % 24;

export const Route = createFileRoute("/api/agent/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const session = await requireAgent(request);
          if (!session) return json({ error: "Não autenticado" }, 401);
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const url = new URL(request.url);
          const days = Math.min(Math.max(Number(url.searchParams.get("days") ?? 30), 1), 180);
          const since = new Date(Date.now() - days * 86400_000).toISOString();

          const db = supabaseAdmin();

          const { data: convsRaw, error } = await db
            .from("conversations")
            .select("id, status, agent_name, created_at, handoff_at, closed_at")
            .gte("created_at", since)
            .limit(5000);
          if (error) return json({ error: error.message }, 500);

          const convs = (convsRaw || []) as ConvRow[];
          const escalated = convs.filter((c) => c.handoff_at);

          // primeira resposta humana de cada conversa escalada
          let firstAgentAt = new Map<string, string>();
          if (escalated.length) {
            const { data: agentMsgs } = await db
              .from("messages")
              .select("conversation_id, created_at")
              .eq("role", "agent")
              .in("conversation_id", escalated.map((c) => c.id))
              .order("created_at", { ascending: true })
              .limit(5000);
            for (const m of (agentMsgs || []) as { conversation_id: string; created_at: string }[]) {
              if (!firstAgentAt.has(m.conversation_id)) {
                firstAgentAt.set(m.conversation_id, m.created_at);
              }
            }
          }

          const firstResponses: number[] = [];
          const resolutions: number[] = [];
          for (const c of escalated) {
            const t0 = Date.parse(c.handoff_at!);
            const fa = firstAgentAt.get(c.id);
            if (fa) firstResponses.push(Math.max(0, Math.round((Date.parse(fa) - t0) / 1000)));
            if (c.closed_at)
              resolutions.push(Math.max(0, Math.round((Date.parse(c.closed_at) - t0) / 1000)));
          }

          // série diária: resolvidas só pela IA vs escaladas
          const byDayMap = new Map<string, { ia: number; escalados: number }>();
          for (let i = days - 1; i >= 0; i--) {
            byDayMap.set(dayKey(new Date(Date.now() - i * 86400_000).toISOString()), {
              ia: 0,
              escalados: 0,
            });
          }
          for (const c of convs) {
            const k = dayKey(c.created_at);
            const row = byDayMap.get(k);
            if (!row) continue;
            if (c.handoff_at) row.escalados++;
            else row.ia++;
          }

          // escalonamentos por hora do dia
          const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
          for (const c of escalated) byHour[hourOf(c.handoff_at!)].count++;

          // atendimentos por consultor
          const agentMap = new Map<string, number>();
          for (const c of escalated) {
            if (!c.agent_name) continue;
            agentMap.set(c.agent_name, (agentMap.get(c.agent_name) ?? 0) + 1);
          }

          const countBy = (s: string) => convs.filter((c) => c.status === s).length;

          return json({
            range_days: days,
            totals: {
              conversations: convs.length,
              escalated: escalated.length,
              escalation_rate: convs.length ? escalated.length / convs.length : 0,
              waiting: countBy("waiting"),
              live: countBy("live"),
              offline: countBy("offline"),
              closed: countBy("closed"),
            },
            response: {
              avg_first_response_sec: mean(firstResponses),
              median_first_response_sec: median(firstResponses),
              avg_resolution_sec: mean(resolutions),
              answered: firstResponses.length,
              pending: escalated.length - firstResponses.length,
            },
            by_day: [...byDayMap.entries()].map(([date, v]) => ({ date, ...v })),
            by_hour: byHour,
            by_agent: [...agentMap.entries()]
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
