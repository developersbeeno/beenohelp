import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  LogOut,
  CheckCircle2,
  Clock,
  Mail,
  Headset,
  RefreshCw,
  Lock,
  BarChart3,
  Inbox as InboxIcon,
  History as HistoryIcon,
  KeyRound,
  ShieldCheck,
  Paperclip,
  X as XIcon,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { SupportDashboard } from "@/components/SupportDashboard";
import { SupportHistory } from "@/components/SupportHistory";
import { AgentAdmin } from "@/components/AgentAdmin";
import { AttachmentList, type Attachment } from "@/components/Attachments";

export const Route = createFileRoute("/atendimento")({
  head: () => ({
    meta: [
      { title: "Atendimento — Beeno Help Center" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgentPanel,
});

type Status = "bot" | "waiting" | "live" | "offline" | "closed";
type Role = "user" | "assistant" | "agent" | "system";

type Conversation = {
  id: string;
  status: Status;
  visitor_name: string | null;
  visitor_email: string | null;
  subject: string | null;
  agent_name: string | null;
  handoff_reason: string | null;
  created_at: string;
  last_message_at: string;
  handoff_at: string | null;
};

type Message = {
  id: string;
  role: Role;
  content: string;
  author_name: string | null;
  attachments: Attachment[] | null;
  created_at: string;
};

const STATUS_META: Record<Status, { label: string; cls: string }> = {
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

type SessionInfo = {
  allowed_domains: string[];
  email_login_ready: boolean;
};

function AgentPanel() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [agent, setAgent] = useState("");
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [mustSetPassword, setMustSetPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [linkError, setLinkError] = useState("");

  const loadSession = useCallback(async () => {
    try {
      const d = await (await fetch("/api/agent/session")).json();
      setAuthed(Boolean(d.authenticated));
      if (d.name) setAgent(d.name);
      setMustSetPassword(Boolean(d.must_set_password));
      setIsAdmin(Boolean(d.is_admin));
      setInfo({
        allowed_domains: d.allowed_domains || [],
        email_login_ready: Boolean(d.email_login_ready),
      });
    } catch {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    // chegou pelo link do e-mail: consome o token e já entra
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (!token) {
      loadSession();
      return;
    }

    // tira o token da barra de endereço para não ficar no histórico
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.toString());

    fetch("/api/agent/verify-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setLinkError(d.error || "Link inválido.");
          setAuthed(false);
          return;
        }
        setAgent(d.name);
        // NÃO chamar loadSession() aqui: num link de reset o banco ainda tem a
        // senha antiga e a sessão diria must_set_password=false, pulando a
        // tela de senha nova. O verify-link é a fonte da verdade neste caminho
        // — por isso ele também devolve is_admin.
        setMustSetPassword(Boolean(d.must_set_password));
        setIsAdmin(Boolean(d.is_admin));
        setAuthed(true);
      })
      .catch(() => {
        setLinkError("Erro de rede ao validar o link.");
        setAuthed(false);
      });
  }, [loadSession]);

  if (authed === null) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!authed) {
    return (
      <LoginForm
        info={info}
        initialError={linkError}
        onSuccess={(name, needsPassword, admin) => {
          setAgent(name);
          setMustSetPassword(needsPassword);
          setIsAdmin(admin);
          setAuthed(true);
        }}
      />
    );
  }

  if (mustSetPassword) {
    // recarrega a sessão ao terminar: garante is_admin/must_set_password
    // coerentes com o banco depois da senha gravada
    return <CreatePasswordForm agent={agent} onDone={loadSession} />;
  }

  return <Inbox agent={agent} isAdmin={isAdmin} onLogout={() => setAuthed(false)} />;
}

// ------------------------------------------------------------ criar senha
function CreatePasswordForm({ agent, onDone }: { agent: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    if (password !== confirm) return setError("As senhas não conferem.");
    setLoading(true);
    try {
      const res = await fetch("/api/agent/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Não foi possível salvar a senha.");
      onDone();
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="h-4 w-4 text-primary" />
          <h1 className="text-lg font-semibold">Crie sua senha</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Olá, {agent}! Defina uma senha para entrar direto nas próximas vezes.
        </p>

        <div className="space-y-3">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            autoFocus
            placeholder="Nova senha (mínimo 8 caracteres)"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            type="password"
            autoComplete="new-password"
            placeholder="Repita a senha"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {error && <div className="text-xs text-destructive">{error}</div>}
          <button
            onClick={submit}
            disabled={loading || !password || !confirm}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-95 transition disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Salvar e entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- login
function LoginForm({
  info,
  initialError,
  onSuccess,
}: {
  info: SessionInfo | null;
  initialError?: string;
  onSuccess: (name: string, needsPassword: boolean, isAdmin: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError || "");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const domains = info?.allowed_domains ?? ["beeno.ai", "skeps.com.br"];

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  /** Primeiro acesso ou "esqueci minha senha": manda o link do e-mail. */
  const requestLink = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) return setError("Informe seu e-mail corporativo.");
    setLoading(true);
    try {
      const res = await fetch("/api/agent/request-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.retry_after) setCooldown(data.retry_after);
        return setError(data.error || "Não foi possível enviar o link.");
      }
      setLinkSent(true);
      setCooldown(60);
      setNotice(
        // Mensagem neutra (não revela is_reset): quem observa não descobre se o
        // e-mail já tem senha cadastrada — fecha o oráculo de enumeração.
        `Se ${email} tiver acesso liberado, enviamos um link. Abra o e-mail para continuar — ele vale por ${data.expires_minutes} minutos.`,
      );
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const res = await fetch("/api/agent/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // ainda não tem senha: já dispara o link em vez de culpar o usuário
        if (data.needs_link) {
          setError("");
          await requestLink();
          return;
        }
        return setError(data.error || "Não foi possível entrar.");
      }
      onSuccess(data.name, false, Boolean(data.is_admin));
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  };

  if (linkSent) {
    return (
      <div className="flex items-center justify-center px-4 py-24">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-sm text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center mb-3">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg font-semibold mb-1">Verifique seu e-mail</h1>
          <p className="text-sm text-muted-foreground mb-5">{notice}</p>
          {error && <div className="text-xs text-destructive mb-3">{error}</div>}
          <div className="flex items-center justify-center gap-4 text-xs">
            <button
              onClick={() => {
                setLinkSent(false);
                setNotice("");
                setError("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Voltar
            </button>
            <button
              onClick={requestLink}
              disabled={cooldown > 0 || loading}
              className="text-primary font-medium disabled:opacity-50 disabled:text-muted-foreground"
            >
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="h-4 w-4 text-primary" />
          <h1 className="text-lg font-semibold">Painel de atendimento</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Entre com seu e-mail corporativo ({domains.map((d) => "@" + d).join(" ou ")}).
        </p>

        <div className="space-y-3">
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            type="email"
            autoComplete="username"
            autoFocus
            placeholder="voce@beeno.ai"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email.trim() && password && login()}
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {error && <div className="text-xs text-destructive">{error}</div>}
          <button
            onClick={login}
            disabled={loading || !email.trim() || !password}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-95 transition disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <button
              onClick={requestLink}
              disabled={loading}
              className="text-primary font-medium hover:underline disabled:opacity-50"
            >
              Primeiro acesso
            </button>
            <button
              onClick={requestLink}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- inbox
function Inbox({
  agent,
  isAdmin,
  onLogout,
}: {
  agent: string;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"inbox" | "metrics" | "history" | "admin">("inbox");
  const [pending, setPending] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<string | null>(null);
  const prevWaitingRef = useRef(0);

  // conversa vinda do link do WhatsApp: /atendimento?c=<id>
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) setSelected(c);
  }, []);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/conversations");
      if (res.status === 401) return onLogout();
      const data = await res.json();
      const list: Conversation[] = data.conversations || [];
      setConversations(list);

      // título da aba pisca quando entra alguém na fila
      const waiting = list.filter((c) => c.status === "waiting").length;
      document.title =
        waiting > 0 ? `(${waiting}) Atendimento — Beeno` : "Atendimento — Beeno Help Center";
      prevWaitingRef.current = waiting;
    } catch {
      /* silencioso */
    }
  }, [onLogout]);

  useEffect(() => {
    loadList();
    const iv = setInterval(loadList, 5000);
    return () => clearInterval(iv);
  }, [loadList]);

  // troca de conversa: recarrega tudo
  useEffect(() => {
    if (!selected) {
      setMessages([]);
      setConv(null);
      return;
    }
    cursorRef.current = null;
    setMessages([]);

    let cancelled = false;
    const tick = async () => {
      try {
        const params = new URLSearchParams({ id: selected });
        if (cursorRef.current) params.set("after", cursorRef.current);
        const res = await fetch(`/api/agent/thread?${params}`);
        if (res.status === 401) return onLogout();
        if (!res.ok) return;
        const data = (await res.json()) as { conversation: Conversation; messages: Message[] };
        if (cancelled) return;

        setConv(data.conversation);
        if (data.messages.length) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id));
            const fresh = data.messages.filter((m) => !seen.has(m.id));
            return fresh.length ? [...prev, ...fresh] : prev;
          });
          cursorRef.current = data.messages[data.messages.length - 1].created_at;
        }
      } catch {
        /* silencioso */
      }
    };

    tick();
    const iv = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [selected, onLogout]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const uploadFiles = async (files: File[]) => {
    if (!files.length || !selected) return;
    for (const file of files.slice(0, 5 - pending.length)) {
      // mesmo limite do cliente: acima disso a plataforma corta a request
      if (file.size > 4 * 1024 * 1024) {
        setUploadError(`"${file.name}" passa de 4 MB.`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("conversation_id", selected);
        const res = await fetch("/api/support/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) setPending((p) => [...p, data as Attachment]);
      } catch {
        /* silencioso */
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const send = async () => {
    const text = reply.trim();
    const files = pending;
    if ((!text && !files.length) || !selected || sending || uploading > 0) return;
    setSending(true);
    setReply("");
    setPending([]);
    try {
      const res = await fetch("/api/agent/thread", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected, content: text, attachments: files }),
      });
      if (res.status === 401) return onLogout();
      const data = await res.json();
      if (data.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message],
        );
        cursorRef.current = data.message.created_at;
      }
      loadList();
    } catch {
      /* silencioso */
    } finally {
      setSending(false);
    }
  };

  const act = async (action: "claim" | "close" | "reopen") => {
    if (!selected) return;
    await fetch("/api/agent/thread", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: selected, action }),
    });
    cursorRef.current = null;
    setMessages([]);
    loadList();
  };

  const logout = async () => {
    await fetch("/api/agent/session", { method: "DELETE" });
    onLogout();
  };

  const waiting = conversations.filter((c) => c.status === "waiting");
  const live = conversations.filter((c) => c.status === "live");
  const offline = conversations.filter((c) => c.status === "offline");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Headset className="h-5 w-5 text-primary" />
            Atendimento
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Conectado como <span className="font-medium text-foreground">{agent}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setRefreshing(true);
              await loadList();
              setTimeout(() => setRefreshing(false), 400);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition text-muted-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>

      {/* guias */}
      <div className="flex items-center gap-1 border-b border-border mb-5">
        {([
          { key: "inbox", label: "Atendimentos", icon: InboxIcon, badge: waiting.length },
          { key: "metrics", label: "Métricas", icon: BarChart3, badge: 0 },
          { key: "history", label: "Histórico", icon: HistoryIcon, badge: 0 },
          // guia Admin só existe para quem administra o time
          ...(isAdmin
            ? ([{ key: "admin", label: "Admin", icon: ShieldCheck, badge: 0 }] as const)
            : []),
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition -mb-px border-b-2
                ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.badge > 0 && (
                <span className="ml-0.5 h-5 min-w-5 px-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 text-[11px] font-bold flex items-center justify-center">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "metrics" && <SupportDashboard onUnauthorized={onLogout} />}

      {tab === "admin" && isAdmin && <AgentAdmin onUnauthorized={onLogout} />}

      {tab === "history" && (
        <SupportHistory
          onUnauthorized={onLogout}
          onOpen={(id) => {
            setSelected(id);
            setTab("inbox");
          }}
        />
      )}

      {tab === "inbox" && (
        <>
      {/* contadores */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { n: waiting.length, label: "Na fila", cls: "text-amber-600 dark:text-amber-400" },
          { n: live.length, label: "Ao vivo", cls: "text-emerald-600 dark:text-emerald-400" },
          { n: offline.length, label: "Recados", cls: "text-sky-600 dark:text-sky-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-background px-4 py-3">
            <div className={`text-2xl font-bold ${s.cls}`}>{s.n}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        {/* lista */}
        <div className="rounded-xl border border-border bg-background overflow-hidden max-h-[70vh] overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum atendimento no momento.
            </div>
          )}
          {conversations.map((c) => {
            const meta = STATUS_META[c.status];
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition hover:bg-muted/60
                  ${selected === c.id ? "bg-muted" : ""}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium text-sm truncate">
                    {c.visitor_name || "Visitante"}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {timeAgo(c.last_message_at)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate mb-1.5">
                  {c.subject || c.handoff_reason || "Sem assunto"}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${meta.cls}`}>
                    {meta.label}
                  </span>
                  {c.agent_name && (
                    <span className="text-[10px] text-muted-foreground">{c.agent_name}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* thread */}
        <div className="rounded-xl border border-border bg-background flex flex-col min-h-[70vh] max-h-[70vh]">
          {!selected || !conv ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Selecione um atendimento à esquerda.
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {conv.visitor_name || "Visitante"}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                    {conv.visitor_email && (
                      <a
                        href={`mailto:${conv.visitor_email}`}
                        className="inline-flex items-center gap-1 hover:text-foreground"
                      >
                        <Mail className="h-3 w-3" />
                        {conv.visitor_email}
                      </a>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(conv.created_at)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-medium ${STATUS_META[conv.status].cls}`}
                    >
                      {STATUS_META[conv.status].label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conv.status === "waiting" && (
                    <button
                      onClick={() => act("claim")}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-95 transition"
                    >
                      Assumir
                    </button>
                  )}
                  {conv.status !== "closed" ? (
                    <button
                      onClick={() => act("close")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Encerrar
                    </button>
                  ) : (
                    <button
                      onClick={() => act("reopen")}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition"
                    >
                      Reabrir
                    </button>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
                            ? conv.visitor_name || "Cliente"
                            : m.role === "assistant"
                              ? "IA"
                              : m.author_name || "Você"}
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

              {conv.status === "offline" ? (
                <div className="border-t border-border p-4 text-sm text-muted-foreground">
                  Recado deixado fora do horário. Responda por e-mail em{" "}
                  <a
                    className="text-primary font-medium"
                    href={`mailto:${conv.visitor_email}?subject=${encodeURIComponent(
                      "Re: sua dúvida no Beeno Help Center",
                    )}`}
                  >
                    {conv.visitor_email}
                  </a>
                  . Se preferir responder por aqui, clique em <strong>Assumir</strong> — o cliente
                  verá sua resposta se voltar ao chat.
                  <button
                    onClick={() => act("claim")}
                    className="mt-3 block px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    Assumir no chat
                  </button>
                </div>
              ) : conv.status === "closed" ? (
                <div className="border-t border-border p-4 text-sm text-muted-foreground text-center">
                  Atendimento encerrado.
                </div>
              ) : (
                <div className="border-t border-border p-3">
                  {(pending.length > 0 || uploading > 0) && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {pending.map((a) => (
                        <div
                          key={a.path}
                          className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg border border-border bg-muted/60 text-xs max-w-[200px]"
                        >
                          <Paperclip className="h-3 w-3 text-primary shrink-0" />
                          <span className="truncate">{a.name}</span>
                          <button
                            onClick={() => setPending((p) => p.filter((x) => x.path !== a.path))}
                            className="p-0.5 rounded hover:bg-background shrink-0"
                            aria-label={`Remover ${a.name}`}
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {uploading > 0 && (
                        <span className="text-xs text-muted-foreground px-2 py-1">
                          Enviando {uploading}...
                        </span>
                      )}
                    </div>
                  )}
                  {uploadError && (
                    <div className="text-[11px] text-destructive mb-2">{uploadError}</div>
                  )}
                  <div className="flex gap-2 items-end">
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,text/plain,text/csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        uploadFiles([...(e.target.files || [])]);
                        e.target.value = "";
                      }}
                    />
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onPaste={(e) => {
                        const files = [...(e.clipboardData?.items || [])]
                          .filter((i) => i.kind === "file")
                          .map((i) => i.getAsFile())
                          .filter((f): f is File => Boolean(f));
                        if (files.length) {
                          e.preventDefault();
                          uploadFiles(files);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      rows={2}
                      placeholder="Responder ao cliente... (Enter envia, Shift+Enter quebra linha, Ctrl+V cola print)"
                      style={{ resize: "none" }}
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32 overflow-auto"
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={pending.length >= 5}
                      className="h-10 w-10 rounded-xl border border-border bg-background text-muted-foreground flex items-center justify-center hover:bg-muted hover:text-foreground transition disabled:opacity-50 shrink-0"
                      aria-label="Anexar arquivo"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      onClick={send}
                      disabled={sending || uploading > 0 || (!reply.trim() && !pending.length)}
                      className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:brightness-95 transition disabled:opacity-50 shrink-0"
                      aria-label="Enviar"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
