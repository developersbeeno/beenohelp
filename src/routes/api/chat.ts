import { createFileRoute } from "@tanstack/react-router";
import {
  ensureConversation,
  insertMessage,
  sanitizeAttachments,
  supabaseConfigured,
} from "@/lib/supabase.server";

type ChatMsg = { role: "user" | "assistant"; content: string };

type ChatBody = {
  // Text mode
  messages?: ChatMsg[];
  conversation_id?: string;
  // Audio mode
  audio_base64?: string;
  audio_mime?: string;
  history?: ChatMsg[];
  attachments?: unknown;
  // Selected UI language, forwarded to the assistant workflow
  locale?: "pt" | "en" | "es";
};

const N8N_AI = "https://integrations-hook.beeno.ai/webhook/beeno-helpcenterai";

const ERROR_STRINGS = {
  pt: {
    assistant: (status: number) => `Erro no assistente (${status})`,
    emptyReply: "Resposta vazia",
    requiredMessages: "Mensagens obrigatórias",
    unknown: "Erro desconhecido",
  },
  en: {
    assistant: (status: number) => `Assistant error (${status})`,
    emptyReply: "Empty response",
    requiredMessages: "Messages are required",
    unknown: "Unknown error",
  },
  es: {
    assistant: (status: number) => `Error del asistente (${status})`,
    emptyReply: "Respuesta vacía",
    requiredMessages: "Los mensajes son obligatorios",
    unknown: "Error desconocido",
  },
} as const;

function errorStringsFor(locale: ChatBody["locale"]) {
  return ERROR_STRINGS[locale ?? "pt"] ?? ERROR_STRINGS.pt;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as ChatBody;
          const t = errorStringsFor(body.locale);
          const convId = body.conversation_id;

          const isAudio = typeof body.audio_base64 === "string" && body.audio_base64.length > 0;

          // Se um humano já assumiu (ou a conversa está na fila), a IA sai de cena:
          // a mensagem vira mensagem para o atendente.
          const files = convId ? sanitizeAttachments(body.attachments, convId) : [];

          if (convId && supabaseConfigured()) {
            const conv = await ensureConversation(convId);
            if (conv && (conv.status === "waiting" || conv.status === "live")) {
              const lastUser = [...(body.messages || [])].reverse().find((m) => m.role === "user");
              const text = lastUser?.content || "🎤 Mensagem de voz";
              await insertMessage(convId, "user", text, null, files);
              return json({ text: "", handled_by_human: true, status: conv.status });
            }
          }

          let text = "";

          if (isAudio) {
            // Audio path — forward directly to N8N with audio payload
            const res = await fetch(N8N_AI, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                audio_base64: body.audio_base64,
                audio_mime: body.audio_mime || "audio/webm",
                history: (body.history || []).map((m) => ({ role: m.role, content: m.content })),
                conversation_id: convId || "default",
                locale: body.locale || "pt",
              }),
            });

            if (!res.ok) return json({ error: t.assistant(res.status) }, 502);

            const data = (await res.json()) as { reply?: string; text?: string; error?: string };
            text = data.reply || data.text || "";
            if (!text) return json({ error: data.error || t.emptyReply }, 502);

            if (convId && supabaseConfigured()) {
              await ensureConversation(convId);
              await insertMessage(convId, "user", "🎤 Mensagem de voz");
              await insertMessage(convId, "assistant", text);
            }
          } else {
            // Text path
            const messages = Array.isArray(body.messages) ? body.messages : [];
            if (messages.length === 0) return json({ error: t.requiredMessages }, 400);

            const lastUser = [...messages].reverse().find((m) => m.role === "user");
            const history = messages.slice(0, -1);

            const res = await fetch(N8N_AI, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                message: lastUser?.content || "",
                history: history.map((m) => ({ role: m.role, content: m.content })),
                conversation_id: convId || "default",
                locale: body.locale || "pt",
              }),
            });

            if (!res.ok) return json({ error: t.assistant(res.status) }, 502);

            const data = (await res.json()) as { reply?: string; text?: string; error?: string };
            text = data.reply || data.text || "";
            if (!text) return json({ error: data.error || t.emptyReply }, 502);

            if (convId && supabaseConfigured()) {
              await ensureConversation(convId);
              await insertMessage(convId, "user", lastUser?.content || "", null, files);
              await insertMessage(convId, "assistant", text);
            }
          }

          return json({ text });
        } catch (err) {
          const msg = err instanceof Error ? err.message : ERROR_STRINGS.pt.unknown;
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
