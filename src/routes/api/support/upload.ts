import { createFileRoute } from "@tanstack/react-router";

import { corsHeaders, preflight } from "@/lib/cors.server";
import {
  ALLOWED_MIME,
  BUCKET,
  MAX_UPLOAD_BYTES,
  supabaseAdmin,
  supabaseConfigured,
} from "@/lib/supabase.server";

// O widget comercial roda no beeno.ai (outra origem).
const json = (request: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...corsHeaders(request) },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nome de arquivo seguro: sem caminho, sem acento exótico, sem surpresa. */
function safeName(name: string): string {
  return (
    name
      .split(/[\\/]/)
      .pop()!
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-80) || "arquivo"
  );
}

/**
 * Recebe print colado ou arquivo escolhido no computador.
 * Sobe para um bucket PRIVADO — o acesso depois é só por link assinado.
 */
export const Route = createFileRoute("/api/support/upload")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),

      POST: async ({ request }) => {
        try {
          if (!supabaseConfigured()) return json(request, { error: "Upload indisponível." }, 503);

          // formData() estoura em corpo ausente/malformado — isso é erro do
          // cliente (400), não falha do servidor (500)
          let form: FormData;
          try {
            form = await request.formData();
          } catch {
            return json(request, { error: "Envio inválido." }, 400);
          }

          const file = form.get("file");
          const conversationId = String(form.get("conversation_id") || "");

          if (!(file instanceof File)) return json(request, { error: "Arquivo ausente." }, 400);
          if (!UUID_RE.test(conversationId)) {
            return json(request, { error: "Conversa inválida." }, 400);
          }
          if (file.size > MAX_UPLOAD_BYTES) {
            return json(request, { error: "Arquivo muito grande (máximo 4 MB)." }, 413);
          }
          if (!ALLOWED_MIME.includes(file.type)) {
            return json(
              request,
              { error: "Tipo não permitido. Envie imagem, áudio, PDF, CSV ou planilha." },
              415,
            );
          }

          // caminho isolado por conversa + nome aleatório: um anexo nunca
          // sobrescreve outro nem é adivinhável
          const path = `${conversationId}/${crypto.randomUUID()}-${safeName(file.name)}`;

          const { error } = await supabaseAdmin()
            .storage.from(BUCKET)
            .upload(path, file, { contentType: file.type, upsert: false });

          if (error) {
            console.error("upload:", error.message);
            return json(request, { error: "Falha ao enviar o arquivo." }, 500);
          }

          return json(request, {
            path,
            name: safeName(file.name),
            type: file.type,
            size: file.size,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return json(request, { error: msg }, 500);
        }
      },
    },
  },
});
