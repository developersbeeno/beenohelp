import { createFileRoute } from "@tanstack/react-router";
import {
  LINK_TTL_MIN,
  MAX_LINKS_PER_HOUR,
  RESEND_COOLDOWN_SEC,
  allowedDomains,
  deriveName,
  generateLinkToken,
  hashLinkToken,
  isAllowedEmail,
  normalizeEmail,
} from "@/lib/agent-auth.server";
import { isEmailOnRoster, supabaseAdmin, supabaseConfigured } from "@/lib/supabase.server";
import { sendLoginLink } from "@/lib/support.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/**
 * Envia o link de verificação por e-mail.
 * Usado no primeiro acesso e também no "esqueci minha senha".
 */
export const Route = createFileRoute("/api/agent/request-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const { email: rawEmail } = (await request.json()) as { email?: string };
          const email = normalizeEmail(rawEmail || "");

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

          // Quem não está no roster não recebe link. A resposta é a MESMA de
          // um envio bem-sucedido — quem sonda de fora não descobre quem faz
          // parte do time (evita enumerar os atendentes).
          if (!(await isEmailOnRoster(email))) {
            await new Promise((r) => setTimeout(r, 500));
            return json({ ok: true, expires_minutes: LINK_TTL_MIN });
          }

          const db = supabaseAdmin();
          const now = Date.now();

          const { data: recent } = await db
            .from("agent_login_codes")
            .select("created_at")
            .eq("email", email)
            .gte("created_at", new Date(now - 3600_000).toISOString())
            .order("created_at", { ascending: false })
            .limit(MAX_LINKS_PER_HOUR);

          const list = recent || [];
          if (list.length >= MAX_LINKS_PER_HOUR) {
            return json({ error: "Muitos pedidos. Tente novamente daqui a pouco." }, 429);
          }
          if (list.length) {
            const since = (now - Date.parse(list[0].created_at)) / 1000;
            if (since < RESEND_COOLDOWN_SEC) {
              return json(
                {
                  error: `Aguarde ${Math.ceil(RESEND_COOLDOWN_SEC - since)}s para pedir outro link.`,
                  retry_after: Math.ceil(RESEND_COOLDOWN_SEC - since),
                },
                429,
              );
            }
          }

          const token = generateLinkToken();
          const tokenHash = await hashLinkToken(token);

          // um link novo invalida os anteriores
          await db
            .from("agent_login_codes")
            .update({ used_at: new Date().toISOString() })
            .eq("email", email)
            .is("used_at", null);

          const { data: agent } = await db
            .from("agents")
            .select("name, password_hash")
            .eq("email", email)
            .maybeSingle();

          // Quem já tem senha está REDEFININDO: o kind='reset' faz o painel
          // exigir uma senha nova depois do link — sem isso a pessoa entraria
          // uma vez e continuaria sem saber a própria senha.
          const isReset = Boolean(agent?.password_hash);

          const { error: insErr } = await db.from("agent_login_codes").insert({
            email,
            code_hash: tokenHash,
            kind: isReset ? "reset" : "link",
            expires_at: new Date(now + LINK_TTL_MIN * 60_000).toISOString(),
          });
          if (insErr) return json({ error: insErr.message }, 500);

          const sent = await sendLoginLink({
            to: email,
            name: agent?.name || deriveName(email),
            token,
            expiresMinutes: LINK_TTL_MIN,
            isReset,
          });

          if (!sent.ok) {
            console.error("sendLoginLink:", sent.error);
            return json(
              { error: "Não consegui enviar o e-mail. Avise o time técnico." },
              502,
            );
          }

          // Resposta byte-a-byte igual à do caminho "fora do roster": expor
          // is_reset revelaria se o e-mail é do time e se já tem senha.
          return json({ ok: true, expires_minutes: LINK_TTL_MIN });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
