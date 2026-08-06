import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveCompanyId } from "@/lib/tenant";

export const pingPresenca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("user_id", userId);
    return { ok: true };
  });

export const getDashboardSupervisao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const companyId = await resolveCompanyId(supabase, userId);
    const now = new Date();

    const [
      { data: membros },
      { data: cards },
      { data: mensagens },
      { data: filas },
      { data: filaMembers },
    ] = await Promise.all([
      supabase.from("profiles").select("user_id, nome, email, last_seen_at").eq("company_id", companyId),
      supabase.from("crm_cards").select("id, numero, owner_id, status, stage_id, ultima_em, created_at").eq("company_id", companyId).eq("status", "aberto"),
      supabase.from("mensagens").select("numero, direcao, created_at").eq("company_id", companyId).gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString()).order("created_at", { ascending: false }),
      (supabase as any).from("queues").select("id, nome, cor").eq("company_id", companyId).eq("ativo", true),
      (supabase as any).from("queue_members").select("queue_id, user_id").eq("company_id", companyId),
    ]);

    // Última mensagem de saída por número (proxy de "última resposta do atendente")
    const ultimaRespostaMapa = new Map<string, Date>();
    for (const m of (mensagens ?? []) as any[]) {
      if (m.direcao === "saida" && !ultimaRespostaMapa.has(m.numero)) {
        ultimaRespostaMapa.set(m.numero, new Date(m.created_at));
      }
    }

    // Métricas por atendente
    const atendentes = (membros ?? []).map((m: any) => {
      const abertos = ((cards ?? []) as any[]).filter((c) => c.owner_id === m.user_id);
      // Conversa mais antiga sem resposta nos últimas 24h
      let maiorEsperaMin = 0;
      for (const c of abertos) {
        const ultimaResp = ultimaRespostaMapa.get(c.numero);
        const ref = ultimaResp ?? new Date(c.created_at ?? c.ultima_em ?? now);
        const diffMin = Math.round((now.getTime() - ref.getTime()) / 60_000);
        if (diffMin > maiorEsperaMin) maiorEsperaMin = diffMin;
      }

      const lastSeen = m.last_seen_at ? new Date(m.last_seen_at) : null;
      const online = lastSeen ? (now.getTime() - lastSeen.getTime()) < 5 * 60_000 : false;

      return {
        user_id: m.user_id as string,
        nome: (m.nome || m.email || m.user_id.slice(0, 8)) as string,
        online,
        last_seen_at: m.last_seen_at as string | null,
        conversas_abertas: abertos.length,
        maior_espera_min: maiorEsperaMin,
      };
    });

    // Métricas por fila
    const queueMemberMap = new Map<string, string[]>(); // queue_id → [user_ids]
    for (const qm of (filaMembers ?? []) as any[]) {
      if (!queueMemberMap.has(qm.queue_id)) queueMemberMap.set(qm.queue_id, []);
      queueMemberMap.get(qm.queue_id)!.push(qm.user_id);
    }

    // Cards sem dono = aguardando atribuição
    const semDono = ((cards ?? []) as any[]).filter((c) => !c.owner_id);

    // Cards sem dono agrupados por fila via membros (atribuição indireta)
    // Enquanto crm_cards não tem queue_id, exibimos por membros da fila
    const filasList = ((filas ?? []) as any[]).map((f: any) => {
      const membrosIds = queueMemberMap.get(f.id) ?? [];
      const membrosOnline = atendentes.filter((a) => membrosIds.includes(a.user_id) && a.online).length;

      return {
        id: f.id as string,
        nome: f.nome as string,
        cor: f.cor as string,
        aguardando: 0, // sem queue_id em crm_cards ainda; mostrado no KPI global
        mais_antigo_min: 0,
        membros_online: membrosOnline,
        total_membros: membrosIds.length,
      };
    });

    return { atendentes, filas: filasList, total_abertos: (cards ?? []).length };
  });
