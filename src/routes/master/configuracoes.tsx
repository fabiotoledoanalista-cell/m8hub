import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, X, Save, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { brand } from "@/config/brand";
import { getSuperAdminEmails, setSuperAdminEmails } from "@/lib/master.functions";
import { getBillingWebhookInfo, listRecentBillingEvents } from "@/lib/billing.functions";

export const Route = createFileRoute("/master/configuracoes")({
  head: () => ({ meta: [{ title: `${brand.name} — Master Config` }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const get = useServerFn(getSuperAdminEmails);
  const set = useServerFn(setSuperAdminEmails);
  const getWebhooks = useServerFn(getBillingWebhookInfo);
  const getEvents = useServerFn(listRecentBillingEvents);

  const [emails, setEmails] = useState<string[]>([]);
  const [novo, setNovo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tokens, setTokens] = useState<{ kiwify: string; cakto: string; perfectpay: string } | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [r, w, e] = await Promise.all([get(), getWebhooks(), getEvents()]);
        setEmails(r.emails);
        setTokens(w);
        setEvents(e);
      } catch (e: any) {
        toast.error(e?.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const v = novo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toast.error("Email inválido");
    if (emails.includes(v)) return toast.message("Já está na lista");
    setEmails([...emails, v]);
    setNovo("");
  }

  async function save() {
    setSaving(true);
    try { await set({ data: { emails } }); toast.success("Salvo"); }
    catch (e: any) { toast.error(e?.message); }
    finally { setSaving(false); }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = (provider: "kiwify" | "cakto" | "perfectpay") =>
    tokens?.[provider]
      ? `${origin}/api/public/billing/webhook?provider=${provider}&token=${tokens[provider]}`
      : "";

  async function copy(s: string) {
    try { await navigator.clipboard.writeText(s); toast.success("Copiado"); }
    catch { toast.error("Não consegui copiar"); }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Super admins e integrações de cobrança.</p>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Webhooks de cobrança</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Cole essas URLs no painel da Kiwify, Cakto ou Perfectpay. Eventos de venda chegam aqui e liberam o cliente automaticamente
            (vínculo pelo e-mail do comprador).
          </p>
        </div>

        {loading ? (
          <div className="grid place-items-center py-6"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-3">
            {(["kiwify", "cakto", "perfectpay"] as const).map((p) => (
              <div key={p} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider">{p}</span>
                  {tokens?.[p] ? (
                    <Badge variant="secondary" className="text-[10px]">configurado</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">sem token</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input readOnly value={url(p) || "(defina o secret)"} className="font-mono text-[11px]" />
                  <Button size="sm" variant="outline" onClick={() => copy(url(p))} disabled={!url(p)}>
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold mb-2">Últimos eventos recebidos</h3>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum webhook recebido ainda.</p>
          ) : (
            <ul className="space-y-1.5">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-xs border rounded-md px-2.5 py-1.5">
                  {e.processed && !e.error ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                  )}
                  <span className="font-mono text-[10px] uppercase">{e.provider}</span>
                  <span className="truncate">{e.event_type}</span>
                  <span className="text-muted-foreground truncate">{e.buyer_email || "—"}</span>
                  {e.error && <span className="text-amber-600 truncate ml-auto">{e.error}</span>}
                  <span className="text-muted-foreground ml-auto whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Emails de super admin</h2>
        <form onSubmit={add} className="flex gap-2">
          <Input placeholder="email@exemplo.com" value={novo} onChange={(e) => setNovo(e.target.value)} />
          <Button type="submit" variant="outline"><Plus className="size-4 mr-1" /> Adicionar</Button>
        </form>
        {loading ? (
          <div className="grid place-items-center py-6"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <ul className="space-y-2">
            {emails.length === 0 && <li className="text-sm text-muted-foreground">Nenhum email cadastrado.</li>}
            {emails.map((e) => (
              <li key={e} className="flex items-center justify-between border rounded-md px-3 py-2">
                <span className="text-sm">{e}</span>
                <button onClick={() => setEmails(emails.filter((x) => x !== e))} className="text-muted-foreground hover:text-destructive" title="Remover">
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
            Salvar
          </Button>
        </div>
      </Card>
    </div>
  );
}
