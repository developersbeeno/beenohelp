import { createFileRoute } from "@tanstack/react-router";
import {
  ensureConversation,
  insertMessage,
  sanitizeAttachments,
  supabaseAdmin,
  supabaseConfigured,
  type DbMessage,
} from "@/lib/supabase.server";
import {
  buildTranscript,
  businessHoursLabel,
  isBusinessHours,
  notifyTeam,
  panelUrl,
} from "@/lib/support.server";

type Locale = "pt" | "en" | "es";

type Body = {
  conversation_id?: string;
  name?: string;
  email?: string;
  question?: string;
  attachments?: unknown;
  locale?: Locale;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const STRINGS: Record<
  Locale,
  {
    conversationIdRequired: string;
    nameRequired: string;
    emailInvalid: string;
    unknownError: string;
    defaultSubject: string;
    filesAttached: (n: number) => string;
    requestedHuman: (name: string) => string;
    leftOfflineMessage: (name: string, email: string) => string;
    receivedOffline: string;
    connectingConsultant: string;
    offlineWithHours: (hours: string, email: string) => string;
  }
> = {
  pt: {
    conversationIdRequired: "conversation_id obrigatório",
    nameRequired: "Informe seu nome.",
    emailInvalid: "Informe um e-mail válido.",
    unknownError: "Erro desconhecido",
    defaultSubject: "Atendimento humano",
    filesAttached: (n) => `📎 ${n} arquivo(s) anexado(s)`,
    requestedHuman: (name) => `${name} pediu atendimento humano. Aguardando um consultor assumir.`,
    leftOfflineMessage: (name, email) =>
      `${name} deixou uma mensagem fora do horário. Retorno por e-mail em ${email}.`,
    receivedOffline: "Recebemos seu contato! Nosso time vai responder no e-mail informado.",
    connectingConsultant: "Estou chamando um consultor do Beeno. Já já alguém assume por aqui!",
    offlineWithHours: (hours, email) =>
      `Estamos fora do horário de atendimento (${hours}). Registramos sua dúvida e o time responde em ${email}.`,
  },
  en: {
    conversationIdRequired: "conversation_id is required",
    nameRequired: "Please enter your name.",
    emailInvalid: "Please enter a valid email.",
    unknownError: "Unknown error",
    defaultSubject: "Human support",
    filesAttached: (n) => `📎 ${n} file(s) attached`,
    requestedHuman: (name) => `${name} requested human support. Waiting for a consultant to take over.`,
    leftOfflineMessage: (name, email) =>
      `${name} left a message outside business hours. We'll reply by email at ${email}.`,
    receivedOffline: "We've received your message! Our team will reply to the email you provided.",
    connectingConsultant: "I'm calling in a Beeno consultant. Someone will take over shortly!",
    offlineWithHours: (hours, email) =>
      `We're currently outside business hours (${hours}). We've logged your question and the team will reply at ${email}.`,
  },
  es: {
    conversationIdRequired: "conversation_id es obligatorio",
    nameRequired: "Indica tu nombre.",
    emailInvalid: "Indica un correo válido.",
    unknownError: "Error desconocido",
    defaultSubject: "Atención humana",
    filesAttached: (n) => `📎 ${n} archivo(s) adjunto(s)`,
    requestedHuman: (name) => `${name} solicitó atención humana. Esperando a que un consultor la asuma.`,
    leftOfflineMessage: (name, email) =>
      `${name} dejó un mensaje fuera de horario. Responderemos por correo a ${email}.`,
    receivedOffline: "¡Recibimos tu contacto! Nuestro equipo responderá al correo indicado.",
    connectingConsultant: "Estoy llamando a un consultor de Beeno. ¡Alguien se hará cargo enseguida!",
    offlineWithHours: (hours, email) =>
      `Estamos fuera del horario de atención (${hours}). Registramos tu duda y el equipo responderá a ${email}.`,
  },
};

function stringsFor(locale?: Locale) {
  return STRINGS[locale ?? "pt"] ?? STRINGS.pt;
}

export const Route = createFileRoute("/api/handoff")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as Body;
          const t = stringsFor(body.locale);

          const conversationId = (body.conversation_id || "").trim();
          const name = (body.name || "").trim().slice(0, 120);
          const email = (body.email || "").trim().toLowerCase().slice(0, 200);
          const question = (body.question || "").trim().slice(0, 4000);

          if (!conversationId) return json({ error: t.conversationIdRequired }, 400);
          if (!name) return json({ error: t.nameRequired }, 400);
          if (!EMAIL_RE.test(email)) return json({ error: t.emailInvalid }, 400);

          const open = isBusinessHours();
          const mode: "live" | "offline" = open ? "live" : "offline";

          if (!supabaseConfigured()) {
            // Sem banco ainda: pelo menos avisa o time para não perder o cliente.
            await notifyTeam({
              event: open ? "handoff_waiting" : "offline_ticket",
              conversation_id: conversationId,
              visitor_name: name,
              visitor_email: email,
              question,
              transcript: null,
              panel_url: panelUrl(conversationId),
              business_hours: open,
              created_at: new Date().toISOString(),
            });
            return json({
              mode: "offline",
              business_hours_label: businessHoursLabel(),
              message: t.receivedOffline,
            });
          }

          const db = supabaseAdmin();
          await ensureConversation(conversationId);

          const { data: msgs } = await db
            .from("messages")
            .select("role, content")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(50);

          const transcript = buildTranscript((msgs || []) as Pick<DbMessage, "role" | "content">[]);

          await db
            .from("conversations")
            .update({
              status: open ? "waiting" : "offline",
              visitor_name: name,
              visitor_email: email,
              handoff_reason: question || null,
              subject: (question || t.defaultSubject).slice(0, 140),
              handoff_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              // já avisamos o time agora; segura o próximo aviso por 5min
              last_notified_at: new Date().toISOString(),
            })
            .eq("id", conversationId);

          const files = sanitizeAttachments(body.attachments, conversationId);
          if (question || files.length) {
            await insertMessage(conversationId, "user", question || t.filesAttached(files.length), null, files);
          }

          const systemMsg = await insertMessage(
            conversationId,
            "system",
            open ? t.requestedHuman(name) : t.leftOfflineMessage(name, email),
          );

          await notifyTeam({
            event: open ? "handoff_waiting" : "offline_ticket",
            conversation_id: conversationId,
            visitor_name: name,
            visitor_email: email,
            question,
            transcript,
            attachments: files.length,
            panel_url: panelUrl(conversationId),
            business_hours: open,
            created_at: new Date().toISOString(),
          });

          return json({
            mode,
            // cursor do relógio do banco: o polling só traz o que vier depois disto
            cursor: systemMsg?.created_at ?? new Date().toISOString(),
            business_hours_label: businessHoursLabel(),
            message: open ? t.connectingConsultant : t.offlineWithHours(businessHoursLabel(), email),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : STRINGS.pt.unknownError;
          return json({ error: msg }, 500);
        }
      },
    },
  },
});
