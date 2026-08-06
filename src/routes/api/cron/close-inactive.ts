import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cron/close-inactive")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = new URL(request.url).searchParams.get("secret");
        if (secret !== process.env.CRON_SECRET) {
          return new Response("unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Buscar todas as configs com inatividade ativa
        const { data: configs } = await (supabaseAdmin as any)
          .from("agent_config")
          .select("company_id, horas_inatividade")
          .not("horas_inatividade", "is", null)
          .gt("horas_inatividade", 0);

        if (!configs || configs.length === 0) return new Response("nada", { status: 200 });

        let totalFechadas = 0;

        for (const cfg of configs) {
          const companyId = cfg.company_id as string;
          const horas = cfg.horas_inatividade as number;
          const corte = new Date(Date.now() - horas * 60 * 60_000).toISOString();

          // Primeiro stage terminal (tipo perda) da empresa
          const { data: stagePerda } = await supabaseAdmin
            .from("crm_stage")
            .select("id, nome")
            .eq("company_id", companyId)
            .eq("tipo", "perda")
            .order("ordem", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!stagePerda) continue;

          // Cards com stage normal que não tiveram mensagem recente
          const { data: cards } = await supabaseAdmin
            .from("crm_cards")
            .select("id, stage_id, crm_stage(tipo)")
            .eq("company_id", companyId)
            .lt("ultima_em", corte)
            .is("fechado_em", null);

          const ativos = (cards ?? []).filter((c: any) => {
            const tipo = c.crm_stage?.tipo;
            return tipo !== "ganho" && tipo !== "perda";
          });

          if (ativos.length === 0) continue;

          const ids = ativos.map((c: any) => c.id);

          await (supabaseAdmin as any)
            .from("crm_cards")
            .update({
              stage_id: stagePerda.id,
              status: stagePerda.nome,
              motivo_fechamento: "Inatividade",
              fechado_em: new Date().toISOString(),
            })
            .eq("company_id", companyId)
            .in("id", ids);

          const eventos = ids.map((card_id: string) => ({
            company_id: companyId,
            card_id,
            tipo: "fechamento",
            descricao: `Encerrado automaticamente por inatividade (${horas}h)`,
          }));
          await supabaseAdmin.from("lead_evento").insert(eventos);

          totalFechadas += ids.length;
        }

        return new Response(JSON.stringify({ ok: true, fechadas: totalFechadas }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
