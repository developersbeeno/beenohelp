/**
 * Autenticação do painel de atendimento.
 * Login por e-mail corporativo + código de 6 dígitos enviado por e-mail.
 * A sessão é um cookie assinado com HMAC-SHA256.
 */

const COOKIE = "beeno_agent";
const MAX_AGE = 60 * 60 * 12; // 12h

export const CODE_TTL_MIN = 10; // validade do código
export const MAX_CODE_ATTEMPTS = 5; // tentativas por código
export const MAX_CODES_PER_HOUR = 5; // pedidos por e-mail por hora
export const RESEND_COOLDOWN_SEC = 60; // intervalo mínimo entre pedidos

function secret(): string {
  const s = process.env.AGENT_SESSION_SECRET;
  if (s) return s;
  // Sem segredo em produção, todo cookie de sessão seria forjável. Em vez de
  // cair num literal público, recusamos operar — falha barulhenta é melhor que
  // um bypass de autenticação silencioso.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("AGENT_SESSION_SECRET não configurada — autenticação do painel desabilitada.");
  }
  return "beeno-dev-secret-apenas-local";
}

/** Domínios liberados. Configurável sem deploy via AGENT_ALLOWED_DOMAINS. */
export function allowedDomains(): string[] {
  return (process.env.AGENT_ALLOWED_DOMAINS || "beeno.ai,skeps.com.br")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Allowlist opcional de e-mails específicos (AGENT_ALLOWED_EMAILS).
 * Quando definida, SÓ esses endereços entram — impede que qualquer caixa do
 * domínio (skeps.com.br é a empresa inteira) se auto-cadastre como atendente.
 * Vazia = mantém o controle só por domínio.
 */
export function allowedEmails(): string[] {
  return (process.env.AGENT_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 200);
}

export function isAllowedEmail(email: string): boolean {
  if (!EMAIL_RE.test(email)) return false;
  const list = allowedEmails();
  if (list.length) return list.includes(email); // allowlist tem prioridade
  const domain = email.split("@")[1];
  return allowedDomains().includes(domain);
}

/** "vitor.gutierrez@beeno.ai" -> "Vitor Gutierrez" */
export function deriveName(email: string): string {
  const local = email.split("@")[0];
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ") || local
  );
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}

/** Comparação em tempo constante, evita timing attack. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Código de 6 dígitos com gerador criptográfico (não Math.random). */
export function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

/**
 * Hash do código amarrado ao e-mail: um código emitido para um endereço
 * não vale para outro, mesmo que alguém adivinhe os 6 dígitos.
 */
export function hashCode(email: string, code: string): Promise<string> {
  return hmac(`login:${email}:${code}`);
}

// ------------------------------------------------- link de verificação

export const LINK_TTL_MIN = 30; // validade do link do e-mail
export const MAX_LINKS_PER_HOUR = 5;

/** Token do link: 32 bytes aleatórios, impossível de adivinhar. */
export function generateLinkToken(): string {
  return b64url(crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * Diferente do código, o hash do link NÃO é amarrado ao e-mail — assim
 * conseguimos localizar o registro só com o token que veio na URL.
 * A entropia de 256 bits torna a busca por força bruta inviável.
 */
export function hashLinkToken(token: string): Promise<string> {
  return hmac(`link:${token}`);
}

// ------------------------------------------------------------- senha

/** OWASP 2023 para PBKDF2-SHA256. */
const PBKDF2_ITERATIONS = 210_000;

export const MIN_PASSWORD_LENGTH = 8;

/** Regras mínimas — mensagem de erro ou null se estiver ok. */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (password.length > 200) return "Senha longa demais.";
  if (/^\d+$/.test(password)) return "Use letras também, não só números.";
  const fracas = ["12345678", "senha123", "password", "beeno123", "qwertyui"];
  if (fracas.includes(password.toLowerCase())) return "Essa senha é muito comum. Escolha outra.";
  return null;
}

/**
 * PBKDF2-SHA256 com salt por atendente. Devolve hash e salt em base64url.
 * Passe o salt existente para verificar; omita para criar uma senha nova.
 */
export async function derivePassword(
  password: string,
  saltB64?: string,
): Promise<{ hash: string; salt: string }> {
  const salt = saltB64 ? fromB64url(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return { hash: b64url(new Uint8Array(bits)), salt: b64url(salt) };
}

/** Confere a senha contra o hash guardado, em tempo constante. */
export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
): Promise<boolean> {
  try {
    const { hash } = await derivePassword(password, storedSalt);
    return safeEqual(hash, storedHash);
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------ sessão

export type Session = { name: string; email: string };

export async function createSession(email: string, name: string): Promise<string> {
  const payload = b64url(
    new TextEncoder().encode(JSON.stringify({ e: email, n: name, exp: Date.now() + MAX_AGE * 1000 })),
  );
  return `${payload}.${await hmac(payload)}`;
}

export async function readSession(token: string | null): Promise<Session | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!safeEqual(sig, await hmac(payload))) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as {
      e?: string;
      n: string;
      exp: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    // sessões antigas (senha compartilhada) não tinham e-mail
    return { name: data.n, email: data.e ?? "" };
  } catch {
    return null;
  }
}

export function sessionCookie(token: string): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${MAX_AGE}`;
}

export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

export function readCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === COOKIE) return rest.join("=");
  }
  return null;
}

/** Gate das rotas /api/agent/*. */
export async function requireAgent(request: Request): Promise<Session | null> {
  return readSession(readCookie(request));
}

