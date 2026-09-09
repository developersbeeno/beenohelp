import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Mail,
  X,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { AttachmentList, type Attachment } from "@/components/Attachments";

type Status = "bot" | "waiting" | "live" | "offline" | "closed";

type Row = {
  id: string;
  status: Status;
  visitor_name: string | null;
  visitor_email: string | null;
  subject: string | null;
  agent_name: string | null;
  handoff_reason: string | null;
  created_at: string;
  handoff_at: string | null;
  closed_at: string | null;
  last_message_at: string;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  author_name: string | null;
  attachments: Attachment[] | null;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  waiting: {
    label: "Aguardando",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
  },
  live: {
    label: "Ao vivo",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  offline: {
    label: "Recado / e-mail",
    cls: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-400",
  },
  closed: { label: "Encerrado", cls: "bg-muted text-muted-foreground" },
  bot: { label: "IA", cls: "bg-muted text-muted-foreground" },
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtDuration = (from: string, to: string) => {
  const s = Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}min` : `${h}h`;
};

export function SupportHistory({
  onUnauthorized,
  onOpen,
}: {
  onUnauthorized: () => void;
  onOpen: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("");
  const [agent, setAgent] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [agents, setAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // conversa aberta para leitura
  const [detail, setDetail] = useState<Row | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // digitar não dispara uma busca por tecla
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedQ) params.set("q", debouncedQ);
      if (status) params.set("status", status);
      if (agent) params.set("agent", agent);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/agent/history?${params}`);
      if (res.status === 401) return onUnauthorized();
      if (!res.ok) return;
      const d = await res.json();
      setRows(d.conversations || []);
      setTotal(d.total || 0);
      setPerPage(d.per_page || 25);
      setAgents(d.agents || []);
    } catch {
      /* silencioso */
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, status, agent, from, to, page, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (row: Row) => {
    setDetail(row);
    setMessages([]);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/agent/thread?id=${row.id}`);
      if (res.status === 401) return onUnauthorized();
      if (!res.ok) return;
      const d = await res.json();
      setMessages(d.messages || []);
    } catch {
      /* silencioso */
    } finally {
      setLoadingDetail(false);
    }
  };

  const clearFilters = () => {
    setQ("");
    setStatus("");
    setAgent("");
    setFrom("");
    setTo("");
    setPage(0);
  };

  const hasFilters = q || status || agent || from || to;
  const lastPage = Math.max(0, Math.ceil(total / perPage) - 1);

  return (
    <div>
      {/* filtros — uma linha só, acima de tudo que eles afetam */}
      <div className="rounded-xl border border-border bg-background p-3 mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, e-mail ou assunto..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos os status</option>
            <option value="closed">Encerrados</option>
            <option value="offline">Recado / e-mail</option>
            <option value="waiting">Aguardando</option>
            <option value="live">Ao vivo</option>
          </select>

          <select
            value={agent}
            onChange={(e) => {
              setAgent(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos os consultores</option>
            {agents.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Data inicial"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Data final"
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
        <span>
          {loading
            ? "Buscando..."
            : `${total} atendimento${total === 1 ? "" : "s"}${hasFilters ? " encontrado(s)" : ""}`}
        </span>
        {lastPage > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs px-2 tabular-nums">
              {page + 1} / {lastPage + 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted transition"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* tabela */}
      <div className={`rounded-xl border border-border bg-background overflow-hidden ${loading ? "opacity-60" : ""} transition-opacity`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="font-medium px-4 py-2.5">Cliente</th>
                <th className="font-medium px-4 py-2.5">Assunto</th>
                <th className="font-medium px-4 py-2.5">Consultor</th>
                <th className="font-medium px-4 py-2.5">Status</th>
                <th className="font-medium px-4 py-2.5">Abertura</th>
                <th className="font-medium px-4 py-2.5">Duração</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {hasFilters
                      ? "Nenhum atendimento com esses filtros."
                      : "Nenhum atendimento registrado ainda."}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => openDetail(r)}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/50 cursor-pointer transition"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.visitor_name || "Visitante"}</div>
                    {r.visitor_email && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {r.visitor_email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[260px]">
                    <div className="truncate text-muted-foreground">
                      {r.subject || r.handoff_reason || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.agent_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        STATUS_META[r.status]?.cls ?? ""
                      }`}
                    >
                      {STATUS_META[r.status]?.label ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                    {fmtDateTime(r.handoff_at || r.created_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">
                    {r.closed_at && r.handoff_at
                      ? fmtDuration(r.handoff_at, r.closed_at)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-primary font-medium">Ver conversa</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* leitura da conversa */}
      {detail && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold">{detail.visitor_name || "Visitante"}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 mt-1">
                  {detail.visitor_email && (
                    <a
                      href={`mailto:${detail.visitor_email}`}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      <Mail className="h-3 w-3" />
                      {detail.visitor_email}
                    </a>
                  )}
                  <span>{fmtDateTime(detail.handoff_at || detail.created_at)}</span>
                  {detail.agent_name && <span>Atendido por {detail.agent_name}</span>}
                  <span
                    className={`px-1.5 py-0.5 rounded font-medium ${
                      STATUS_META[detail.status]?.cls ?? ""
                    }`}
                  >
                    {STATUS_META[detail.status]?.label ?? detail.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingDetail && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Carregando conversa...
                </div>
              )}
              {messages.map((m) =>
                m.role === "system" ? (
                  <div key={m.id} className="flex justify-center">
                    <div className="text-[11px] text-muted-foreground bg-muted/60 rounded-lg px-3 py-1.5 text-center max-w-[90%]">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "agent" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%]">
                      <div className="text-[11px] text-muted-foreground mb-1 px-1">
                        {m.role === "user"
                          ? detail.visitor_name || "Cliente"
                          : m.role === "assistant"
                            ? "IA"
                            : m.author_name || "Consultor"}
                        <span className="ml-2 tabular-nums">{fmtDateTime(m.created_at)}</span>
                      </div>
                      <div
                        className={`px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl
                          ${
                            m.role === "agent"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : m.role === "assistant"
                                ? "bg-muted/60 text-foreground rounded-bl-sm border border-dashed border-border"
                                : "bg-muted text-foreground rounded-bl-sm"
                          }`}
                      >
                        {m.role === "user" ? m.content : <Markdown>{m.content}</Markdown>}
                      </div>
                      {!!m.attachments?.length && (
                        <AttachmentList
                          items={m.attachments}
                          align={m.role === "agent" ? "right" : "left"}
                        />
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                {messages.length} mensagens
                {messages.some((m) => m.attachments?.length) && (
                  <>
                    <Paperclip className="h-3.5 w-3.5 ml-2" />
                    com anexos
                  </>
                )}
              </span>
              <button
                onClick={() => {
                  onOpen(detail.id);
                  setDetail(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-95 transition"
              >
                Abrir em Atendimentos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
