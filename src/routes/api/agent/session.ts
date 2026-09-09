import { createFileRoute } from "@tanstack/react-router";
import { allowedDomains, clearCookie, requireAgent } from "@/lib/agent-auth.server";
import {
  agentLoginTablesReady,
  isEmailAdmin,
  supabaseAdmin,
  supabaseConfigured,
} from "@/lib/supabase.server";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });

export const Route = createFileRoute("/api/agent/session")({
  server: {
    handlers: {
      /** Quem sou eu, e o login por e-mail está pronto para uso? */
      GET: async ({ request }) => {
        const session = await requireAgent(request);
        const emailReady =
          Boolean(process.env.N8N_AGENT_CODE_WEBHOOK_URL) && (await agentLoginTablesReady());

        // Lido do banco, não do cookie: se a senha for definida em outra
        // aba, esta sessão enxerga na hora.
        let mustSetPassword = false;
        if (session?.email && supabaseConfigured()) {
          const { data } = await supabaseAdmin()
            .from("agents")
            .select("password_hash")
            .eq("email", session.email)
            .maybeSingle();
          mustSetPassword = !data?.password_hash;
        }

        return json({
          authenticated: Boolean(session),
          name: session?.name ?? null,
          email: session?.email ?? null,
          is_admin: session?.email ? await isEmailAdmin(session.email) : false,
          must_set_password: mustSetPassword,
          allowed_domains: allowedDomains(),
          email_login_ready: emailReady,
        });
      },

      DELETE: async () => json({ ok: true }, 200, { "set-cookie": clearCookie() }),
    },
  },
});
