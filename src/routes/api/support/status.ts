import { createFileRoute } from "@tanstack/react-router";
import { businessHoursLabel, isBusinessHours } from "@/lib/support.server";
import { supabaseConfigured } from "@/lib/supabase.server";

/**
 * O widget pergunta antes de oferecer atendimento humano:
 * o recurso está configurado? tem gente agora?
 *
 * `configured` depende SÓ do banco: é ele que garante que o chamado fica
 * registrado e aparece no painel. O aviso no WhatsApp é uma conveniência
 * em cima disso — se ele falhar, o chamado não se perde.
 */
export const Route = createFileRoute("/api/support/status")({
  server: {
    handlers: {
      GET: async () =>
        new Response(
          JSON.stringify({
            configured: supabaseConfigured(),
            open: isBusinessHours(),
            label: businessHoursLabel(),
          }),
          { headers: { "content-type": "application/json", "cache-control": "no-store" } },
        ),
    },
  },
});
