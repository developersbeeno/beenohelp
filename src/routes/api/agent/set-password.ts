import { createFileRoute } from "@tanstack/react-router";
import { derivePassword, requireAgent, validatePassword } from "@/lib/agent-auth.server";
import { supabaseAdmin, supabaseConfigured } from "@/lib/supabase.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

/**
 * Define (ou troca) a senha do atendente já autenticado —
 * seja logo após o link de verificação, seja pelo próprio painel.
 */
export const Route = createFileRoute("/api/agent/set-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await requireAgent(request);
          if (!session?.email) return json({ error: "Não autenticado" }, 401);
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const { password } = (await request.json()) as { password?: string };
          const pwd = password || "";

          const problema = validatePassword(pwd);
          if (problema) return json({ error: problema }, 400);

          const { hash, salt } = await derivePassword(pwd);

          // .select() confirma que a linha existe e foi gravada. PostgREST não
          // retorna erro num UPDATE que casa 0 linhas — sem esta checagem, uma
          // conta ausente devolveria {ok} sem salvar a senha, prendendo o
          // atendente no loop de "criar senha".
          const { data: updated, error } = await supabaseAdmin()
            .from("agents")
            .update({
              password_hash: hash,
              password_salt: salt,
              password_set_at: new Date().toISOString(),
            })
            .eq("email", session.email)
            .select("email");

          if (error) return json({ error: error.message }, 500);
          if (!updated?.length) {
            return json({ error: "Conta não encontrada. Refaça o acesso pelo link do e-mail." }, 404);
          }

          return json({ ok: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
