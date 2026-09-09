import { useCallback, useEffect, useState } from "react";
import { UserPlus, Shield, ShieldOff, Trash2, Check, Clock, Mail } from "lucide-react";

type AgentRow = {
  email: string;
  name: string;
  is_admin: boolean;
  invited_by: string | null;
  created_at: string;
  last_login_at: string | null;
  has_password: boolean;
};

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : "—";

/** Guia Admin: gerencia quem pode acessar o painel de atendimento. */
export function AgentAdmin({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [me, setMe] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/allowlist");
      if (res.status === 401) return onUnauthorized();
      const d = await res.json();
      if (!res.ok) return setError(d.error || "Não foi possível carregar.");
      setAgents(d.agents || []);
      setMe(d.me || "");
      setDomains(d.allowed_domains || []);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) return setError("Informe o e-mail.");
    setSaving(true);
    try {
      const res = await fetch("/api/agent/allowlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, is_admin: isAdmin }),
      });
      const d = await res.json();
      if (!res.ok) return setError(d.error || "Não foi possível cadastrar.");
      setNotice(`${email} cadastrado. Ele já pode entrar em "Primeiro acesso".`);
      setEmail("");
      setName("");
      setIsAdmin(false);
      load();
    } catch {
      setError("Erro de rede.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAdmin = async (row: AgentRow) => {
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/agent/allowlist", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: row.email, is_admin: !row.is_admin }),
      });
      const d = await res.json();
      if (!res.ok) return setError(d.error || "Não foi possível alterar.");
      load();
    } catch {
      setError("Erro de rede.");
    }
  };

  const remove = async (target: string) => {
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/agent/allowlist", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const d = await res.json();
      if (!res.ok) return setError(d.error || "Não foi possível remover.");
      setNotice(`${target} perdeu o acesso ao painel.`);
      setConfirmRemove(null);
      load();
    } catch {
      setError("Erro de rede.");
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Carregando time...</div>;
  }

  return (
    <div>
      {/* cadastro */}
      <div className="rounded-xl border border-border bg-background p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Cadastrar atendente</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Só quem está nesta lista consegue acessar o painel. A pessoa entra pelo
          &quot;Primeiro acesso&quot; e cria a própria senha.
          {domains.length > 0 && (
            <> Domínios aceitos: {domains.map((d) => "@" + d).join(", ")}.</>
          )}
        </p>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && add()}
            type="email"
            placeholder="nome.sobrenome@beeno.ai"
            className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Nome (opcional)"
            className="w-44 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none px-2">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="accent-[var(--primary)]"
            />
            Admin
          </label>
          <button
            onClick={add}
            disabled={saving || !email.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-95 transition disabled:opacity-60"
          >
            {saving ? "Cadastrando..." : "Cadastrar"}
          </button>
        </div>

        {error && <div className="text-xs text-destructive mt-2">{error}</div>}
        {notice && (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" />
            {notice}
          </div>
        )}
      </div>

      {/* lista */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-xs text-muted-foreground">
          {agents.length} pessoa{agents.length === 1 ? "" : "s"} com acesso
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="font-medium px-4 py-2.5">Atendente</th>
                <th className="font-medium px-4 py-2.5">Situação</th>
                <th className="font-medium px-4 py-2.5">Último acesso</th>
                <th className="font-medium px-4 py-2.5">Cadastrado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.email} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium flex items-center gap-2">
                      {a.name}
                      {a.is_admin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary/15 text-primary">
                          Admin
                        </span>
                      )}
                      {a.email === me && (
                        <span className="text-[10px] text-muted-foreground">(você)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    {a.has_password ? (
                      <span className="text-xs inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        Senha criada
                      </span>
                    ) : (
                      <span className="text-xs inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <Clock className="h-3.5 w-3.5" />
                        Aguardando 1º acesso
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    {fmtDate(a.last_login_at)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                    {fmtDate(a.created_at)}
                    {a.invited_by && (
                      <div className="text-[10px] opacity-70">por {a.invited_by.split("@")[0]}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleAdmin(a)}
                        disabled={a.email === me && a.is_admin}
                        title={a.is_admin ? "Remover admin" : "Tornar admin"}
                        className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        {a.is_admin ? (
                          <ShieldOff className="h-3.5 w-3.5" />
                        ) : (
                          <Shield className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {a.email !== me &&
                        (confirmRemove === a.email ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => remove(a.email)}
                              className="text-[11px] px-2 py-1 rounded bg-destructive text-destructive-foreground font-medium"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setConfirmRemove(null)}
                              className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmRemove(a.email)}
                            title="Remover acesso"
                            className="p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 flex items-start gap-1.5">
        <Mail className="h-3.5 w-3.5 mt-px shrink-0" />
        Ao remover alguém, os links de acesso pendentes dessa pessoa são invalidados
        na hora — mas uma sessão já aberta dura até 12h.
      </p>
    </div>
  );
}
