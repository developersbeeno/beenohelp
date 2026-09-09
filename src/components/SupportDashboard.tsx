import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Paleta validada com scripts/validate_palette.js contra as superfícies reais
 * do tema (#ffffff claro / #090d16 escuro) — todos os checks PASS nos dois modos.
 * Slot 1 (azul) e slot 2 (laranja): CVD ΔE 24.7 claro / 26.8 escuro.
 */
const LIGHT = {
  s1: "#2a78d6",
  s2: "#eb6834",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  surface: "#ffffff",
};
const DARK = {
  s1: "#3987e5",
  s2: "#d95926",
  grid: "#2c2c2a",
  axis: "#383835",
  muted: "#898781",
  surface: "#090d16",
};

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

type Metrics = {
  range_days: number;
  totals: {
    conversations: number;
    escalated: number;
    escalation_rate: number;
    waiting: number;
    live: number;
    offline: number;
    closed: number;
  };
  response: {
    avg_first_response_sec: number | null;
    median_first_response_sec: number | null;
    avg_resolution_sec: number | null;
    answered: number;
    pending: number;
  };
  by_day: { date: string; ia: number; escalados: number }[];
  by_hour: { hour: number; count: number }[];
  by_agent: { name: string; count: number }[];
};

const fmtDuration = (sec: number | null) => {
  if (sec === null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}min` : `${h}h`;
};

const fmtDay = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

const RANGES = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

export function SupportDashboard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const dark = useIsDark();
  const C = dark ? DARK : LIGHT;

  const [days, setDays] = useState(30);
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/agent/metrics?days=${days}`);
      if (res.status === 401) return onUnauthorized();
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, [days, onUnauthorized]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  if (loading && !data) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Carregando métricas...</div>;
  }
  if (!data) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Não foi possível carregar as métricas.</div>;
  }

  const t = data.totals;
  const r = data.response;
  const iaRate = t.conversations ? 1 - t.escalation_rate : 0;

  const tooltipStyle = {
    backgroundColor: C.surface,
    border: `1px solid ${C.grid}`,
    borderRadius: 8,
    fontSize: 12,
    color: dark ? "#ffffff" : "#0b0b0b",
  };

  return (
    // opacidade reduzida no refetch em vez de skeleton — sem pulo de layout
    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
      {/* filtro único, acima de tudo que ele afeta */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs text-muted-foreground mr-1">Período:</span>
        {RANGES.map((rg) => (
          <button
            key={rg.days}
            onClick={() => setDays(rg.days)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
              ${
                days === rg.days
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
          >
            {rg.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatTile
          label="Conversas no período"
          value={t.conversations.toLocaleString("pt-BR")}
          hint={`${t.escalated} pediram atendimento humano`}
        />
        <StatTile
          label="Resolvido só pela IA"
          value={`${Math.round(iaRate * 100)}%`}
          hint={`${t.conversations - t.escalated} de ${t.conversations} conversas`}
        />
        <StatTile
          label="Tempo até 1ª resposta"
          value={fmtDuration(r.avg_first_response_sec)}
          hint={r.median_first_response_sec !== null ? `mediana ${fmtDuration(r.median_first_response_sec)}` : "sem dados ainda"}
        />
        <StatTile
          label="Tempo de resolução"
          value={fmtDuration(r.avg_resolution_sec)}
          hint="do pedido até o encerramento"
        />
      </div>

      {/* estado atual — cor + rótulo, nunca cor sozinha */}
      <div className="rounded-xl border border-border bg-background p-4 mb-5">
        <div className="text-sm font-semibold mb-3">Estado atual da fila</div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <StatusChip color="#fab219" label="Aguardando" n={t.waiting} />
          <StatusChip color="#0ca30c" label="Ao vivo" n={t.live} />
          <StatusChip color="#2a78d6" label="Recado / e-mail" n={t.offline} />
          <StatusChip color="#898781" label="Encerrados" n={t.closed} />
          {r.pending > 0 && (
            <StatusChip color="#d03b3b" label="Sem 1ª resposta" n={r.pending} />
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* volume diário: parte-todo ao longo do tempo → coluna empilhada */}
        <ChartCard
          title="Volume por dia"
          subtitle="Conversas atendidas pela IA e as que precisaram de um consultor"
          legend={[
            { color: C.s1, label: "Resolvidas pela IA" },
            { color: C.s2, label: "Escaladas" },
          ]}
          table={
            <SimpleTable
              head={["Dia", "IA", "Escaladas"]}
              rows={data.by_day.map((d) => [fmtDay(d.date), d.ia, d.escalados])}
            />
          }
          className="lg:col-span-2"
        >
          {mounted && (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.by_day} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} strokeWidth={1} />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDay}
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={{ stroke: C.axis }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: dark ? "#ffffff10" : "#0b0b0b08" }}
                  labelFormatter={(v) => `Dia ${fmtDay(String(v))}`}
                />
                {/* stroke na cor da superfície = o gap de 2px entre segmentos */}
                <Bar dataKey="ia" name="Resolvidas pela IA" stackId="a" fill={C.s1}
                     stroke={C.surface} strokeWidth={2} maxBarSize={24} />
                <Bar dataKey="escalados" name="Escaladas" stackId="a" fill={C.s2}
                     stroke={C.surface} strokeWidth={2} maxBarSize={24} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* magnitude por hora → série única, uma cor */}
        <ChartCard
          title="Escalonamentos por hora"
          subtitle="Quando os clientes mais pedem um consultor (fuso de Brasília)"
          table={
            <SimpleTable
              head={["Hora", "Escalonamentos"]}
              rows={data.by_hour.filter((h) => h.count > 0).map((h) => [`${h.hour}h`, h.count])}
            />
          }
        >
          {mounted && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.by_hour} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} strokeWidth={1} />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h) => `${h}h`}
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={{ stroke: C.axis }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fill: C.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: dark ? "#ffffff10" : "#0b0b0b08" }}
                  labelFormatter={(v) => `${v}h`}
                  formatter={(v: number) => [v, "Escalonamentos"]}
                />
                <Bar dataKey="count" fill={C.s1} maxBarSize={18} radius={[4, 4, 0, 0]}>
                  {/* destaca a hora de pico — rótulo seletivo, não em todas as barras */}
                  {data.by_hour.map((h, i) => {
                    const peak = Math.max(...data.by_hour.map((x) => x.count));
                    return (
                      <Cell key={i} fill={h.count === peak && peak > 0 ? C.s2 : C.s1} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            A barra em laranja é o horário de pico.
          </p>
        </ChartCard>

        {/* magnitude por consultor → barra horizontal, valor na ponta */}
        <ChartCard
          title="Atendimentos por consultor"
          subtitle="Quem assumiu as conversas no período"
          table={
            <SimpleTable
              head={["Consultor", "Atendimentos"]}
              rows={data.by_agent.map((a) => [a.name, a.count])}
            />
          }
        >
          {data.by_agent.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
              Nenhum atendimento assumido ainda.
            </div>
          ) : (
            mounted && (
              <ResponsiveContainer width="100%" height={Math.max(220, data.by_agent.length * 44)}>
                <BarChart
                  data={data.by_agent}
                  layout="vertical"
                  margin={{ top: 8, right: 32, left: 8, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke={C.grid} strokeWidth={1} />
                  <XAxis
                    type="number"
                    tick={{ fill: C.muted, fontSize: 11 }}
                    axisLine={{ stroke: C.axis }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: C.muted, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: dark ? "#ffffff10" : "#0b0b0b08" }}
                    formatter={(v: number) => [v, "Atendimentos"]}
                  />
                  <Bar dataKey="count" fill={C.s1} maxBarSize={24} radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="count"
                      position="right"
                      style={{ fill: C.muted, fontSize: 11 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- componentes

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      {/* figuras proporcionais: tabular-nums só em colunas */}
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function StatusChip({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-sm font-semibold tabular-nums">{n}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  legend,
  children,
  table,
  className = "",
}: {
  title: string;
  subtitle?: string;
  legend?: { color: string; label: string }[];
  children: React.ReactNode;
  table?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-background p-4 ${className}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
        </div>
        {legend && (
          <div className="flex items-center gap-3">
            {legend.map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {children}
      {table && (
        <details className="mt-3 group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
            Ver dados em tabela
          </summary>
          <div className="mt-2 max-h-56 overflow-auto">{table}</div>
        </details>
      )}
    </div>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-muted-foreground text-left">
          {head.map((h) => (
            <th key={h} className="font-medium py-1.5 pr-3 border-b border-border">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={head.length} className="py-2 text-muted-foreground">
              Sem dados no período.
            </td>
          </tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              {r.map((c, j) => (
                <td key={j} className="py-1.5 pr-3">
                  {c}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
