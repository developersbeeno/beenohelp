/**
 * CORS para os endpoints usados pelo widget comercial.
 *
 * O help center é servido em help.beeno.ai e sempre falou consigo mesmo
 * (mesma origem). O widget de vendas roda no beeno.ai, que é outro projeto —
 * daí a necessidade de liberar explicitamente essas origens.
 *
 * Allowlist fechada de propósito: nada de `*`. Estes endpoints criam lead no
 * CRM e avisam o time, então origem desconhecida não entra.
 */

const PADRAO = [
  "https://beeno.ai",
  "https://www.beeno.ai",
  "https://help.beeno.ai",
];

/** Origens extras via env (vírgula), útil para preview da Vercel. */
function permitidas(): string[] {
  const extra = (process.env.WIDGET_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...PADRAO, ...extra];
}

/** Ecoa a origem quando ela está na allowlist. Sem match, não devolve nada. */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin) return {};

  const ok =
    permitidas().includes(origin) ||
    // previews da Vercel do próprio projeto
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);

  if (!ok) return {};

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

/** Resposta JSON já com os headers de CORS aplicados. */
export function jsonCors(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...corsHeaders(request),
    },
  });
}

/** Handler de preflight. */
export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
