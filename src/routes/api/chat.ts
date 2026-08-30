import { createFileRoute } from "@tanstack/react-router";

type ChatMsg = { role: "user" | "assistant"; content: string };

type ChatBody = {
  // Text mode
  messages?: ChatMsg[];
  conversation_id?: string;
  // Audio mode
  audio_base64?: string;
  audio_mime?: string;
  history?: ChatMsg[];
  // Selected UI language, forwarded to the assistant workflow
  locale?: "pt" | "en" | "es";
};

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

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as ChatBody;
          const t = errorStringsFor(body.locale);

          const isAudio = typeof body.audio_base64 === "string" && body.audio_base64.length > 0;

          if (isAudio) {
            // Audio path — forward directly to N8N with audio payload
            const res = await fetch("https://integrations-hook.beeno.ai/webhook/beeno-helpcenterai", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                audio_base64: body.audio_base64,
                audio_mime: body.audio_mime || "audio/webm",
                history: (body.history || []).map((m) => ({ role: m.role, content: m.content })),
                conversation_id: body.conversation_id || "default",
                locale: body.locale || "pt",
              }),
            });

            if (!res.ok) {
              return new Response(JSON.stringify({ error: t.assistant(res.status) }), { status: 502 });
            }

            const data = (await res.json()) as { reply?: string; text?: string; error?: string };
            const text = data.reply || data.text || "";
            if (!text) {
              return new Response(JSON.stringify({ error: data.error || t.emptyReply }), { status: 502 });
            }
            return new Response(JSON.stringify({ text }), { headers: { "content-type": "application/json" } });

          } else {
            // Text path
            const messages = Array.isArray(body.messages) ? body.messages : [];
            if (messages.length === 0) {
              return new Response(JSON.stringify({ error: t.requiredMessages }), { status: 400 });
            }

            const lastUser = [...messages].reverse().find((m) => m.role === "user");
            const history = messages.slice(0, -1);

            const res = await fetch("https://integrations-hook.beeno.ai/webhook/beeno-helpcenterai", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                message: lastUser?.content || "",
                history: history.map((m) => ({ role: m.role, content: m.content })),
                conversation_id: body.conversation_id || "default",
                locale: body.locale || "pt",
              }),
            });

            if (!res.ok) {
              return new Response(JSON.stringify({ error: t.assistant(res.status) }), { status: 502 });
            }

            const data = (await res.json()) as { reply?: string; text?: string; error?: string };
            const text = data.reply || data.text || "";
            if (!text) {
              return new Response(JSON.stringify({ error: data.error || t.emptyReply }), { status: 502 });
            }
            return new Response(JSON.stringify({ text }), { headers: { "content-type": "application/json" } });
          }

        } catch (err) {
          const msg = err instanceof Error ? err.message : ERROR_STRINGS.pt.unknown;
          return new Response(JSON.stringify({ error: msg }), { status: 500 });
        }
      },
    },
  },
});
