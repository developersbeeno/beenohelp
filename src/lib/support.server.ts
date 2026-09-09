/**
 * Regras de atendimento humano: horário comercial e avisos ao time via n8n.
 */
import { rosterEmails } from "@/lib/supabase.server";

const TZ = process.env.SUPPORT_TZ || "America/Sao_Paulo";
const START_HOUR = Number(process.env.SUPPORT_START_HOUR ?? 9); // 9h
const END_HOUR = Number(process.env.SUPPORT_END_HOUR ?? 18); // 18h
// 1 = segunda ... 5 = sexta, 6 = sábado, 0 = domingo
const DAYS = (process.env.SUPPORT_DAYS ?? "1,2,3,4,5")
  .split(",")
  .map((d) => Number(d.trim()))
  .filter((d) => !Number.isNaN(d));

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Hora/dia da semana no fuso do atendimento, independente do fuso do servidor. */
export function nowInSupportTz(now: Date = new Date()): { weekday: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = WEEKDAY_INDEX[get("weekday")] ?? 0;
  // "24" aparece à meia-noite em alguns runtimes
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));

  return { weekday, hour, minute };
}

/** true se estamos dentro do horário de atendimento humano. */
export function isBusinessHours(now: Date = new Date()): boolean {
  const { weekday, hour } = nowInSupportTz(now);
  if (!DAYS.includes(weekday)) return false;
  return hour >= START_HOUR && hour < END_HOUR;
}

/** Texto amigável do horário, usado nas mensagens ao cliente. */
export function businessHoursLabel(): string {
  const names = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const sorted = [...DAYS].sort((a, b) => a - b);
  const span =
    sorted.length > 1 && sorted[sorted.length - 1] - sorted[0] === sorted.length - 1
      ? `${names[sorted[0]]} a ${names[sorted[sorted.length - 1]]}`
      : sorted.map((d) => names[d]).join(", ");
  return `${span}, das ${START_HOUR}h às ${END_HOUR}h`;
}

export type NotifyEvent = "handoff_waiting" | "offline_ticket" | "visitor_reply";

export type NotifyPayload = {
  event: NotifyEvent;
  conversation_id: string;
  visitor_name?: string | null;
  visitor_email?: string | null;
  question?: string | null;
  transcript?: string | null;
  /** quantos arquivos o cliente anexou — o time já sabe que tem print */
  attachments?: number;
  panel_url: string;
  business_hours: boolean;
  created_at: string;
  /** preenchido pelo notifyTeam a partir do roster */
  recipients?: string[];
};

/**
 * Avisa o time através de um webhook do n8n (hoje: e-mail para todos os
 * atendentes; no futuro pode virar WhatsApp usando o mesmo payload).
 *
 * Falha de notificação NUNCA derruba o atendimento — só loga. O chamado
 * já está gravado e visível no painel de qualquer forma.
 */
export async function notifyTeam(payload: NotifyPayload): Promise<boolean> {
  const url = process.env.N8N_SUPPORT_WEBHOOK_URL;
  if (!url) {
    console.warn("N8N_SUPPORT_WEBHOOK_URL não configurada — aviso não enviado.");
    return false;
  }

  try {
    // Quem recebe o aviso é o time cadastrado no painel. Resolvemos aqui para
    // o n8n não precisar de credencial do banco.
    const recipients = await rosterEmails();

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (process.env.N8N_SUPPORT_WEBHOOK_TOKEN) {
      headers.authorization = `Bearer ${process.env.N8N_SUPPORT_WEBHOOK_TOKEN}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...payload, recipients }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("notifyTeam: webhook respondeu", res.status);
    return res.ok;
  } catch (err) {
    console.error("notifyTeam:", err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Envia o código de acesso do painel por e-mail, via n8n
 * (fluxo próprio usando a credencial do noreply@beeno.ai).
 *
 * Diferente do aviso de WhatsApp, aqui a falha IMPORTA: sem o e-mail o
 * atendente não entra. Por isso devolvemos o resultado em vez de engolir.
 */
export async function sendLoginCode(params: {
  to: string;
  name: string;
  code: string;
  expiresMinutes: number;
}): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.N8N_AGENT_CODE_WEBHOOK_URL;
  if (!url) return { ok: false, error: "N8N_AGENT_CODE_WEBHOOK_URL não configurada" };

  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    // mesmo padrão dos outros fluxos de OTP do n8n
    if (process.env.N8N_AGENT_CODE_SECRET) {
      headers["x-otp-secret"] = process.env.N8N_AGENT_CODE_SECRET;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "agent_login_code",
        to: params.to,
        name: params.name,
        code: params.code,
        expires_minutes: params.expiresMinutes,
        requested_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { ok: false, error: `webhook respondeu ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "falha de rede" };
  }
}

/**
 * Envia o link de verificação do painel (primeiro acesso ou redefinição
 * de senha), via n8n com a credencial do noreply@beeno.ai.
 */
export async function sendLoginLink(params: {
  to: string;
  name: string;
  token: string;
  expiresMinutes: number;
  isReset: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.N8N_AGENT_CODE_WEBHOOK_URL;
  if (!url) return { ok: false, error: "N8N_AGENT_CODE_WEBHOOK_URL não configurada" };

  const base = (
    process.env.PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://help.beeno.ai")
  ).replace(/\/$/, "");

  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (process.env.N8N_AGENT_CODE_SECRET) {
      headers["x-otp-secret"] = process.env.N8N_AGENT_CODE_SECRET;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "agent_login_link",
        to: params.to,
        name: params.name,
        link: `${base}/atendimento?token=${encodeURIComponent(params.token)}`,
        expires_minutes: params.expiresMinutes,
        is_reset: params.isReset,
        requested_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return { ok: false, error: `webhook respondeu ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "falha de rede" };
  }
}

/** URL pública do painel de atendimento, para o link do aviso no WhatsApp. */
export function panelUrl(conversationId: string): string {
  const base =
    process.env.PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://help.beeno.ai");
  return `${base.replace(/\/$/, "")}/atendimento?c=${conversationId}`;
}

/** Últimas mensagens em texto plano, para o time ter contexto no WhatsApp. */
export function buildTranscript(
  messages: { role: string; content: string }[],
  limit = 8,
): string {
  const label: Record<string, string> = {
    user: "Cliente",
    assistant: "IA",
    agent: "Atendente",
    system: "Sistema",
  };
  return messages
    .slice(-limit)
    .map((m) => `${label[m.role] ?? m.role}: ${m.content.replace(/\s+/g, " ").slice(0, 400)}`)
    .join("\n");
}
