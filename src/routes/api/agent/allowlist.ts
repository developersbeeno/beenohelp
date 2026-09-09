import { createFileRoute } from "@tanstack/react-router";
import {
  allowedDomains,
  deriveName,
  isAllowedEmail,
  normalizeEmail,
  requireAgent,
} from "@/lib/agent-auth.server";
import { isEmailAdmin, supabaseAdmin, supabaseConfigured } from "@/lib/supabase.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/** Só admin passa daqui. Devolve a sessão ou uma Response de erro. */
async function requireAdmin(request: Request) {
  const session = await requireAgent(request);
  if (!session?.email) return { error: json({ error: "Não autenticado" }, 401) };
  if (!supabaseConfigured()) return { error: json({ error: "Banco não configurado" }, 503) };
  if (!(await isEmailAdmin(session.email))) {
    return { error: json({ error: "Acesso restrito aos administradores." }, 403) };
  }
  return { session };
}

/** Gestão do roster do time de atendimento (guia Admin). */
export const Route = createFileRoute("/api/agent/allowlist")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { session, error } = await requireAdmin(request);
        if (error) return error;

        const { data, error: dbErr } = await supabaseAdmin()
          .from("agents")
          .select("email, name, is_admin, invited_by, created_at, last_login_at, password_hash")
          .order("created_at", { ascending: true });

        if (dbErr) return json({ error: dbErr.message }, 500);

        return json({
          me: session!.email,
          allowed_domains: allowedDomains(),
          agents: (data || []).map((a) => ({
            email: a.email,
            name: a.name,
            is_admin: a.is_admin,
            invited_by: a.invited_by,
            created_at: a.created_at,
            last_login_at: a.last_login_at,
            // nunca devolvemos o hash — só se já criou senha
            has_password: Boolean(a.password_hash),
          })),
        });
      },

      /** Cadastra um novo atendente no roster. */
      POST: async ({ request }) => {
        const { session, error } = await requireAdmin(request);
        if (error) return error;

        try {
          const body = (await request.json()) as {
            email?: string;
            name?: string;
            is_admin?: boolean;
          };
          const email = normalizeEmail(body.email || "");

          if (!isAllowedEmail(email)) {
            return json(
              {
                error: `Use um e-mail dos domínios permitidos (${allowedDomains()
                  .map((d) => "@" + d)
                  .join(" ou ")}).`,
              },
              400,
            );
          }

          const db = supabaseAdmin();
          const { data: existing } = await db
            .from("agents")
            .select("email")
            .eq("email", email)
            .maybeSingle();
          if (existing) return json({ error: "Esse e-mail já está cadastrado." }, 409);

          const { error: insErr } = await db.from("agents").insert({
            email,
            name: (body.name || "").trim().slice(0, 60) || deriveName(email),
            is_admin: Boolean(body.is_admin),
            invited_by: session!.email,
          });
          if (insErr) return json({ error: insErr.message }, 500);

          return json({ ok: true });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, 500);
        }
      },

      /** Promove/rebaixa admin. */
      PATCH: async ({ request }) => {
        const { session, error } = await requireAdmin(request);
        if (error) return error;

        try {
          const { email: rawEmail, is_admin } = (await request.json()) as {
            email?: string;
            is_admin?: boolean;
          };
          const email = normalizeEmail(rawEmail || "");
          if (!email) return json({ error: "E-mail obrigatório." }, 400);

          // Não deixa se auto-rebaixar: sem admin, ninguém mais gerencia o time.
          if (email === session!.email && is_admin === false) {
            return json({ error: "Você não pode remover seu próprio acesso de admin." }, 400);
          }

          const { data, error: updErr } = await supabaseAdmin()
            .from("agents")
            .update({ is_admin: Boolean(is_admin) })
            .eq("email", email)
            .select("email");

          if (updErr) return json({ error: updErr.message }, 500);
          if (!data?.length) return json({ error: "Atendente não encontrado." }, 404);

          return json({ ok: true });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, 500);
        }
      },

      /** Remove alguém do roster (perde o acesso na hora). */
      DELETE: async ({ request }) => {
        const { session, error } = await requireAdmin(request);
        if (error) return error;

        try {
          const { email: rawEmail } = (await request.json()) as { email?: string };
          const email = normalizeEmail(rawEmail || "");
          if (!email) return json({ error: "E-mail obrigatório." }, 400);

          // Auto-remoção deixaria o admin fora do próprio painel.
          if (email === session!.email) {
            return json({ error: "Você não pode remover a si mesmo." }, 400);
          }

          const db = supabaseAdmin();

          // links de acesso pendentes dessa pessoa deixam de valer
          await db.from("agent_login_codes").delete().eq("email", email);

          const { data, error: delErr } = await db
            .from("agents")
            .delete()
            .eq("email", email)
            .select("email");

          if (delErr) return json({ error: delErr.message }, 500);
          if (!data?.length) return json({ error: "Atendente não encontrado." }, 404);

          return json({ ok: true });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, 500);
        }
      },
    },
  },
});
