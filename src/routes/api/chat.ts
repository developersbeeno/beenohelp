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
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as ChatBody;

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
              }),
            });

            if (!res.ok) {
              return new Response(JSON.stringify({ error: `Erro no assistente (${res.status})` }), { status: 502 });
            }

            const data = (await res.json()) as { reply?: string; text?: string; error?: string };
            const text = data.reply || data.text || "";
            if (!text) {
              return new Response(JSON.stringify({ error: data.error || "Resposta vazia" }), { status: 502 });
            }
            return new Response(JSON.stringify({ text }), { headers: { "content-type": "application/json" } });

          } else {
            // Text path
            const messages = Array.isArray(body.messages) ? body.messages : [];
            if (messages.length === 0) {
              return new Response(JSON.stringify({ error: "Mensagens obrigatórias" }), { status: 400 });
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
              }),
            });

            if (!res.ok) {
              return new Response(JSON.stringify({ error: `Erro no assistente (${res.status})` }), { status: 502 });
            }

            const data = (await res.json()) as { reply?: string; text?: string; error?: string };
            const text = data.reply || data.text || "";
            if (!text) {
              return new Response(JSON.stringify({ error: data.error || "Resposta vazia" }), { status: 502 });
            }
            return new Response(JSON.stringify({ text }), { headers: { "content-type": "application/json" } });
          }

        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          return new Response(JSON.stringify({ error: msg }), { status: 500 });
        }
      },
    },
  },
});
