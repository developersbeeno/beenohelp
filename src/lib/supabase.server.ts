import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase de SERVIDOR. Usa a service_role key, que ignora RLS.
 * NUNCA importe este arquivo em código que roda no browser.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * As tabelas de login por e-mail existem?
 * Evita ligar o login por código antes de rodar a migration — o que deixaria
 * o time sem nenhuma forma de entrar. Assim que o SQL roda, liga sozinho,
 * sem precisar de deploy.
 *
 * O resultado positivo é memorizado: tabela criada não desaparece.
 */
let loginTablesReady = false;

export async function agentLoginTablesReady(): Promise<boolean> {
  if (loginTablesReady) return true;
  if (!supabaseConfigured()) return false;
  try {
    // SELECT de verdade nas COLUNAS que o login por senha usa: com `head: true`
    // o PostgREST não devolve o corpo do erro e uma coluna ausente passaria
    // despercebida. Inclui as colunas do 004 (kind, password_hash) — sem elas,
    // anunciar o login pronto travaria o primeiro acesso.
    const { error } = await supabaseAdmin()
      .from("agent_login_codes")
      .select("id, kind")
      .limit(1);
    if (error) return false;
    const { error: agentsErr } = await supabaseAdmin()
      .from("agents")
      .select("email, password_hash")
      .limit(1);
    if (agentsErr) return false;
    loginTablesReady = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Roster do time: a tabela `agents` é a lista de quem pode acessar o painel.
 * Ter linha = ter acesso; sem linha, nem o link de verificação é enviado.
 *
 * Ordem de decisão (a primeira que valer manda):
 *  1. roster no banco, se houver alguém cadastrado
 *  2. AGENT_ALLOWED_EMAILS, para semear antes do primeiro cadastro
 *  3. só o domínio (comportamento original)
 *
 * O passo 2/3 existe para o sistema nunca ficar sem ninguém que consiga entrar.
 */
export async function isEmailOnRoster(email: string): Promise<boolean> {
  if (!supabaseConfigured()) return true;
  try {
    const db = supabaseAdmin();
    const { data, error } = await db.from("agents").select("email").eq("email", email).maybeSingle();
    if (error) return true; // banco instável não pode barrar o time
    if (data) return true;

    // não está no roster: só libera se o roster ainda estiver vazio
    const { data: any1, error: cntErr } = await db.from("agents").select("email").limit(1);
    if (cntErr) return true;
    return !any1?.length;
  } catch {
    return true;
  }
}

/** E-mails de todo o time de atendimento — destinatários dos avisos. */
export async function rosterEmails(): Promise<string[]> {
  if (!supabaseConfigured()) return [];
  try {
    const { data, error } = await supabaseAdmin().from("agents").select("email");
    if (error) return [];
    return (data || []).map((a) => a.email as string).filter(Boolean);
  } catch {
    return [];
  }
}

/** É admin do painel (vê a guia Admin e gerencia o roster)? */
export async function isEmailAdmin(email: string): Promise<boolean> {
  if (!email || !supabaseConfigured()) return false;
  try {
    const { data } = await supabaseAdmin()
      .from("agents")
      .select("is_admin")
      .eq("email", email)
      .maybeSingle();
    return Boolean(data?.is_admin);
  } catch {
    return false;
  }
}

export type Role = "user" | "assistant" | "agent" | "system";
export type Status = "bot" | "waiting" | "live" | "offline" | "closed";

export type Attachment = {
  path: string;
  name: string;
  type: string;
  size: number;
  /** preenchido só na leitura — link assinado, temporário */
  url?: string;
};

export type DbMessage = {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  author_name: string | null;
  attachments: Attachment[] | null;
  created_at: string;
};

export const BUCKET = "support-uploads";

/**
 * Só aceita anexos cujo caminho pertence à própria conversa.
 * Sem isso, alguém poderia referenciar o arquivo de outro atendimento
 * e receber um link assinado para ele.
 */
export function sanitizeAttachments(raw: unknown, conversationId: string): Attachment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a): a is Attachment => {
      if (!a || typeof a !== "object") return false;
      const { path, name, type, size } = a as Attachment;
      return (
        typeof path === "string" &&
        path.startsWith(`${conversationId}/`) &&
        !path.includes("..") &&
        typeof name === "string" &&
        typeof type === "string" &&
        typeof size === "number"
      );
    })
    .slice(0, 5)
    .map((a) => ({
      path: a.path,
      name: a.name.slice(0, 120),
      type: a.type.slice(0, 100),
      size: a.size,
    }));
}

/** Tipos aceitos — espelha a trava do bucket. */
export const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
/**
 * 4 MB, não 10: o corpo de uma request para função serverless na Vercel é
 * limitado a ~4,5 MB. Acima disso a plataforma corta antes do nosso código
 * e o usuário veria um erro cru em inglês em vez da mensagem amigável.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * O bucket é privado: nada é servido por URL pública. A cada leitura
 * geramos links assinados de curta duração, para que um print de CRM
 * não fique acessível para sempre a quem descobrir o caminho.
 */
export async function signAttachments<T extends { attachments?: Attachment[] | null }>(
  rows: T[],
  expiresInSec = 3600,
): Promise<T[]> {
  const paths = rows.flatMap((r) => (r.attachments || []).map((a) => a.path));
  if (!paths.length) return rows;

  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrls(paths, expiresInSec);
  if (error || !data) return rows;

  const byPath = new Map(data.map((d) => [d.path, d.signedUrl]));
  return rows.map((r) =>
    r.attachments?.length
      ? {
          ...r,
          attachments: r.attachments.map((a) => ({
            ...a,
            url: byPath.get(a.path) ?? undefined,
          })),
        }
      : r,
  );
}

export type DbConversation = {
  id: string;
  status: Status;
  visitor_name: string | null;
  visitor_email: string | null;
  subject: string | null;
  agent_name: string | null;
  handoff_reason: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  handoff_at: string | null;
  closed_at: string | null;
};

/** Grava uma mensagem. Silenciosamente ignora se o Supabase não estiver configurado. */
export async function insertMessage(
  conversationId: string,
  role: Role,
  content: string,
  authorName?: string | null,
  attachments?: Attachment[] | null,
): Promise<DbMessage | null> {
  if (!supabaseConfigured()) return null;
  const { data, error } = await supabaseAdmin()
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      author_name: authorName ?? null,
      // só manda a coluna quando há anexo: assim uma base sem a migration
      // de anexos ainda grava mensagens normalmente
      ...(attachments?.length ? { attachments } : {}),
    })
    .select()
    .single();
  if (error) {
    console.error("insertMessage:", error.message);
    return null;
  }
  return data as DbMessage;
}

/** Cria a conversa se ainda não existir (id gerado no cliente). */
export async function ensureConversation(id: string): Promise<DbConversation | null> {
  if (!supabaseConfigured()) return null;
  const db = supabaseAdmin();

  const { data: existing } = await db.from("conversations").select("*").eq("id", id).maybeSingle();
  if (existing) return existing as DbConversation;

  const { data, error } = await db.from("conversations").insert({ id }).select().single();
  if (error) {
    // corrida entre duas requisições: relê
    const { data: retry } = await db.from("conversations").select("*").eq("id", id).maybeSingle();
    if (retry) return retry as DbConversation;
    console.error("ensureConversation:", error.message);
    return null;
  }
  return data as DbConversation;
}
