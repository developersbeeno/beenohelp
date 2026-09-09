import { createFileRoute } from "@tanstack/react-router";
import {
  createSession,
  deriveName,
  hashLinkToken,
  isAllowedEmail,
  sessionCookie,
} from "@/lib/agent-auth.server";
import {
  isEmailAdmin,
  isEmailOnRoster,
  supabaseAdmin,
  supabaseConfigured,
} from "@/lib/supabase.server";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });

/**
 * Consome o token do link do e-mail e já autentica o atendente.
 * Se ele ainda não tem senha, o painel pede para criar uma em seguida.
 */
export const Route = createFileRoute("/api/agent/verify-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const { token } = (await request.json()) as { token?: string };
          const raw = (token || "").trim();
          if (!raw) return json({ error: "Link inválido." }, 400);

          const db = supabaseAdmin();
          const nowIso = new Date().toISOString();
          const tokenHash = await hashLinkToken(raw);

          const { data: row } = await db
            .from("agent_login_codes")
            .select("id, email, kind, expires_at, used_at")
            .eq("code_hash", tokenHash)
            .in("kind", ["link", "reset"])
            .is("used_at", null)
            .gt("expires_at", nowIso)
            .maybeSingle();

          if (!row) {
            await new Promise((r) => setTimeout(r, 400));
            return json({ error: "Link expirado ou já utilizado. Peça um novo." }, 401);
          }

          // o domínio pode ter mudado depois do envio — revalida
          if (!isAllowedEmail(row.email)) {
            return json({ error: "E-mail não autorizado." }, 403);
          }

          // Consumo atômico: o UPDATE só casa se ainda estiver não-usado, e
          // pedimos as linhas de volta. Em duas requisições simultâneas (link
          // clicado 2x, prefetch de e-mail), apenas UMA marca a linha — a outra
          // recebe 0 linhas e é rejeitada. Sem isso o token de uso único
          // viraria reutilizável numa corrida.
          const { data: claimed, error: claimErr } = await db
            .from("agent_login_codes")
            .update({ used_at: nowIso })
            .eq("id", row.id)
            .is("used_at", null)
            .select("id");

          if (claimErr || !claimed?.length) {
            await new Promise((r) => setTimeout(r, 300));
            return json({ error: "Link expirado ou já utilizado. Peça um novo." }, 401);
          }

          const { data: existing } = await db
            .from("agents")
            .select("name, password_hash")
            .eq("email", row.email)
            .maybeSingle();

          // Revalida o roster no momento do clique: se a pessoa foi removida
          // do time depois do envio, o link não vale mais.
          if (!(await isEmailOnRoster(row.email))) {
            return json({ error: "Este acesso não está mais liberado." }, 403);
          }

          const name = existing?.name || deriveName(row.email);

          // Se o upsert falhar, NÃO emitimos sessão: sem a linha em agents, o
          // set-password depois atualizaria 0 linhas e o atendente ficaria preso
          // no loop "criar senha". Melhor pedir para tentar de novo.
          const { error: upsertErr } = await db
            .from("agents")
            .upsert({ email: row.email, name, last_login_at: nowIso }, { onConflict: "email" });
          if (upsertErr) {
            console.error("verify-link upsert:", upsertErr.message);
            return json({ error: "Erro ao registrar o acesso. Tente novamente." }, 500);
          }

          const session = await createSession(row.email, name);
          return json(
            {
              ok: true,
              email: row.email,
              name,
              // link de reset SEMPRE pede senha nova, mesmo já tendo uma
              must_set_password: !existing?.password_hash || row.kind === "reset",
              is_admin: await isEmailAdmin(row.email),
            },
            200,
            { "set-cookie": sessionCookie(session) },
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
