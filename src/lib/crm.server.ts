/**
 * Criação de lead no Beeno CRM (plataforma Eloz) a partir do chat comercial.
 *
 * Mesmo contrato usado pelos formulários do beeno.ai: dedup do contato por
 * celular, contato e negócio com propriedades específicas, negócio no funil
 * Comercial/etapa Lead.
 *
 * Regra que vale repetir: **isto nunca derruba o atendimento**. Se o CRM
 * falhar ou demorar, a conversa continua — o consultor atende do mesmo jeito
 * e o lead pode ser reprocessado depois (a conversa fica com crm_deal_id
 * nulo). Por isso todas as chamadas têm timeout e nada lança para fora.
 */

const CRM_DOMAIN = process.env.BEENO_CRM_DOMAIN;
const CRM_API_KEY = process.env.BEENO_CRM_API_KEY;

/** Sem timeout, um CRM lento seguraria a resposta do widget. */
const TIMEOUT_MS = 8_000;

const PIPELINE_COMERCIAL = 6;
const STAGE_LEAD = 38;

export function crmConfigured(): boolean {
  return Boolean(CRM_DOMAIN && CRM_API_KEY);
}

function headers(): HeadersInit {
  return {
    "content-type": "application/json",
    "ELOZ-APIKEY": CRM_API_KEY as string,
  };
}

/** +55DDDNUMERO */
function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (!digits.startsWith("55")) digits = `55${digits}`;
  return `+${digits}`;
}

async function req(method: string, path: string, body: unknown): Promise<{ id?: number }> {
  const res = await fetch(`${CRM_DOMAIN}/api/v1${path}`, {
    method,
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`CRM ${method} ${path} → ${res.status}. ${detail.slice(0, 200)}`);
  }
  return res.json();
}

/** Procura contato pelo celular; null se não existir. */
async function findContactByPhone(phone: string): Promise<number | null> {
  try {
    const res = await fetch(`${CRM_DOMAIN}/api/v1/contacts/search-cellphone`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ value: phone }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data?.results) && data.results.length > 0) {
      return data.results[0]?.id ?? null;
    }
    return data?.id ?? null;
  } catch {
    return null;
  }
}

export type LeadComercial = {
  nome: string;
  email: string;
  telefone: string;
  empresa?: string | null;
  /** o que a pessoa quer resolver — vai para a descrição do negócio */
  assunto?: string | null;
  /** página de onde veio o clique */
  origemUrl?: string | null;
};

/**
 * Cria (ou atualiza) o contato e abre um negócio. Devolve o id do negócio, ou
 * null se não deu — nunca lança.
 */
export async function criarLeadComercial(
  lead: LeadComercial,
): Promise<{ dealId: string | null; erro?: string }> {
  if (!crmConfigured()) {
    console.warn("[crm] BEENO_CRM_* não configurado — lead não foi para o CRM:", lead.email);
    return { dealId: null, erro: "CRM não configurado" };
  }

  try {
    const phone = normalizePhone(lead.telefone);
    const [firstname, ...rest] = lead.nome.trim().split(/\s+/);
    const lastname = rest.join(" ");

    const contactBase: Record<string, string> = {
      firstname,
      email: lead.email,
      mobile: phone,
    };
    if (lastname) contactBase.lastname = lastname;
    if (lead.empresa) contactBase.empresa = lead.empresa;

    let contactId = await findContactByPhone(phone);
    if (!contactId) {
      const contato = await req("POST", "/contacts", { properties: contactBase });
      contactId = contato.id ?? null;
    } else {
      try {
        await req("PATCH", `/contacts/${contactId}`, { properties: contactBase });
      } catch (err) {
        console.warn("[crm] update de contato existente falhou:", err);
      }
    }

    const descricao = [
      "— Chat comercial do site —",
      lead.assunto ? `O que precisa: ${lead.assunto}` : null,
      lead.origemUrl ? `Página de origem: ${lead.origemUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const negocio = await req("POST", "/deals", {
      properties: {
        pipeline_id: PIPELINE_COMERCIAL,
        stage_id: STAGE_LEAD,
        name: lead.empresa ? `${lead.nome} — ${lead.empresa}` : lead.nome,
        source: "Chat do site",
        description: descricao,
      },
      associations: contactId ? { contacts: [contactId] } : {},
    });

    return { dealId: negocio.id != null ? String(negocio.id) : null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[crm] falha ao criar lead comercial:", msg);
    return { dealId: null, erro: msg };
  }
}
