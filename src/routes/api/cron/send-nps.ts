import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cron/send-nps")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = new URL(request.url).searchParams.get("secret");
        if (secret !== process.env.CRON_SECRET) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { evoSendText } = await import("@/lib/evolution.server");

        // Busca empresas com NPS ativo
        const { data: configs } = await (supabaseAdmin as any)
          .from("nps_config")
          .select("company_id, mensagem, delay_minutos")
          .eq("ativo", true);

        if (!configs?.length) return new Response("nada", { status: 200 });

        let enviados = 0;

        for (const cfg of configs) {
          const companyId = cfg.company_id as string;
          const delayMs = (cfg.delay_minutos as number) * 60_000;
          const corte = new Date(Date.now() - delayMs).toISOString();
          const inicio = new Date(Date.now() - delayMs - 10 * 60_000).toISOString(); // janela de 10 min para não reprocessar

          // Cards fechados no período que ainda não receberam NPS
          const { data: cards } = await (supabaseAdmin as any)
            .from("crm_cards")
            .select("id, numero")
            .eq("company_id", companyId)
            .not("fechado_em", "is", null)
            .gte("fechado_em", inicio)
            .lte("fechado_em", corte);

          if (!cards?.length) continue;

          // Verifica quais já têm avaliação pendente ou respondida
          const cardIds = cards.map((c: any) => c.id);
          const { data: jaEnviados } = await (supabaseAdmin as any)
            .from("atendimento_avaliacoes")
            .select("card_id")
            .eq("company_id", companyId)
            .in("card_id", cardIds);

          const jaEnviadosSet = new Set((jaEnviados ?? []).map((a: any) => a.card_id));

          // Instância WhatsApp da empresa
          const { data: inst } = await supabaseAdmin
            .from("whatsapp_instances")
            .select("instance_name")
            .eq("company_id", companyId)
            .eq("status", "open")
            .limit(1)
            .maybeSingle();

          if (!inst?.instance_name) continue;

          for (const card of cards) {
            if (jaEnviadosSet.has(card.id)) continue;
            try {
              await evoSendText(inst.instance_name, card.numero, cfg.mensagem);
              // Registra que foi enviado (nota null = aguardando resposta)
              await (supabaseAdmin as any).from("atendimento_avaliacoes").insert({
                company_id: companyId,
                card_id: card.id,
                nota: null,
                numero: card.numero,
                enviado_em: new Date().toISOString(),
              });
              enviados++;
            } catch { /* ignora se falhar o envio individual */ }
          }
        }

        return new Response(JSON.stringify({ ok: true, enviados }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
