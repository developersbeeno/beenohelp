import { createFileRoute } from "@tanstack/react-router";
import {
  allowedDomains,
  createSession,
  isAllowedEmail,
  normalizeEmail,
  sessionCookie,
  verifyPassword,
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

/** Login do dia a dia: e-mail corporativo + senha criada pelo atendente. */
export const Route = createFileRoute("/api/agent/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const body = (await request.json()) as { email?: string; password?: string };
          const email = normalizeEmail(body.email || "");
          const password = body.password || "";

          if (!isAllowedEmail(email)) {
            return json(
              {
                error: `Use seu e-mail corporativo (${allowedDomains()
                  .map((d) => "@" + d)
                  .join(" ou ")}).`,
              },
              403,
            );
          }
          if (!password) return json({ error: "Informe sua senha." }, 400);

          // fora do roster responde igual a senha errada, sem revelar nada
          if (!(await isEmailOnRoster(email))) {
            await new Promise((r) => setTimeout(r, 700));
            return json({ error: "E-mail ou senha incorretos." }, 401);
          }

          const { data: agent } = await supabaseAdmin()
            .from("agents")
            .select("name, password_hash, password_salt")
            .eq("email", email)
            .maybeSingle();

          // Sem cadastro ou sem senha definida: o caminho é o link de
          // verificação. Não é erro do usuário, é o primeiro acesso.
          if (!agent?.password_hash || !agent.password_salt) {
            // o frontend, ao ver needs_link, dispara o envio do link na hora
            return json(
              { error: "Você ainda não criou uma senha.", needs_link: true },
              409,
            );
          }

          const ok = await verifyPassword(password, agent.password_hash, agent.password_salt);
          if (!ok) {
            // atrasa para desencorajar força bruta
            await new Promise((r) => setTimeout(r, 700));
            return json({ error: "E-mail ou senha incorretos." }, 401);
          }

          const nowIso = new Date().toISOString();
          await supabaseAdmin().from("agents").update({ last_login_at: nowIso }).eq("email", email);

          const token = await createSession(email, agent.name);
          return json(
            { ok: true, email, name: agent.name, is_admin: await isEmailAdmin(email) },
            200,
            { "set-cookie": sessionCookie(token) },
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
