import { createFileRoute } from "@tanstack/react-router";

import { requireAgent } from "@/lib/agent-auth.server";
import {
  AVATAR_BUCKET,
  AVATAR_MIME,
  MAX_AVATAR_BYTES,
  supabaseAdmin,
  supabaseConfigured,
} from "@/lib/supabase.server";

/**
 * Foto de perfil do atendente/consultor.
 *
 * POST   multipart com `file` → sobe a imagem e grava a URL no perfil
 * DELETE                      → remove a foto
 *
 * Só mexe no próprio perfil: o e-mail vem da sessão, nunca do corpo da
 * requisição — assim ninguém troca a foto de outra pessoa.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** e-mail → prefixo de pasta previsível e seguro */
function pasta(email: string): string {
  return email.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

/** Apaga o arquivo anterior para o bucket não acumular fotos órfãs. */
async function limparAnterior(urlAntiga: string | null | undefined) {
  if (!urlAntiga) return;
  const marca = `/${AVATAR_BUCKET}/`;
  const i = urlAntiga.indexOf(marca);
  if (i === -1) return;
  const path = urlAntiga.slice(i + marca.length).split("?")[0];
  if (!path || path.includes("..")) return;
  try {
    await supabaseAdmin().storage.from(AVATAR_BUCKET).remove([decodeURIComponent(path)]);
  } catch {
    // foto órfã no bucket não justifica falhar a troca
  }
}

export const Route = createFileRoute("/api/agent/avatar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const session = await requireAgent(request);
          if (!session) return json({ error: "Não autenticado" }, 401);
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          let form: FormData;
          try {
            form = await request.formData();
          } catch {
            return json({ error: "Envio inválido." }, 400);
          }

          const file = form.get("file");
          if (!(file instanceof File)) return json({ error: "Arquivo ausente." }, 400);
          if (file.size > MAX_AVATAR_BYTES) {
            return json({ error: "Imagem muito grande (máximo 2 MB)." }, 413);
          }
          if (!AVATAR_MIME.includes(file.type)) {
            return json({ error: "Envie uma imagem PNG, JPG ou WebP." }, 415);
          }

          const db = supabaseAdmin();
          const { data: atual } = await db
            .from("agents")
            .select("avatar_url")
            .eq("email", session.email)
            .maybeSingle();

          // nome aleatório: a URL é pública, então não pode ser adivinhável
          const path = `${pasta(session.email)}/${crypto.randomUUID()}.${EXT[file.type]}`;

          const { error: upErr } = await db.storage
            .from(AVATAR_BUCKET)
            .upload(path, file, { contentType: file.type, upsert: false });
          if (upErr) {
            console.error("[avatar] upload:", upErr.message);
            return json({ error: "Falha ao enviar a imagem." }, 500);
          }

          const {
            data: { publicUrl },
          } = db.storage.from(AVATAR_BUCKET).getPublicUrl(path);

          const { error: updErr } = await db
            .from("agents")
            .update({ avatar_url: publicUrl })
            .eq("email", session.email);
          if (updErr) {
            console.error("[avatar] update do perfil:", updErr.message);
            return json({ error: "Falha ao salvar a foto no perfil." }, 500);
          }

          // Conversas em andamento passam a mostrar a foto nova na hora,
          // sem esperar o atendente assumir outro atendimento.
          await db
            .from("conversations")
            .update({ agent_avatar: publicUrl })
            .eq("agent_email", session.email)
            .in("status", ["live", "waiting"]);

          await limparAnterior(atual?.avatar_url as string | null);

          return json({ ok: true, avatar_url: publicUrl });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          console.error("[avatar] POST:", msg);
          return json({ error: msg }, 500);
        }
      },

      DELETE: async ({ request }) => {
        try {
          const session = await requireAgent(request);
          if (!session) return json({ error: "Não autenticado" }, 401);
          if (!supabaseConfigured()) return json({ error: "Banco não configurado" }, 503);

          const db = supabaseAdmin();
          const { data: atual } = await db
            .from("agents")
            .select("avatar_url")
            .eq("email", session.email)
            .maybeSingle();

          await db.from("agents").update({ avatar_url: null }).eq("email", session.email);
          await db
            .from("conversations")
            .update({ agent_avatar: null })
            .eq("agent_email", session.email)
            .in("status", ["live", "waiting"]);
          await limparAnterior(atual?.avatar_url as string | null);

          return json({ ok: true, avatar_url: null });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
