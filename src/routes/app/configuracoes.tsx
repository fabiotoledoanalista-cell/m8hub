import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, CreditCard, Sparkles, AlertTriangle, Plus, Trash2, GripVertical, Upload } from "lucide-react";
import { brand } from "@/config/brand";
import { trialDaysLeft } from "@/lib/tenant";
import { useServerFn } from "@tanstack/react-start";
import { listFieldDefs, upsertFieldDef, deleteFieldDef } from "@/lib/custom-fields.functions";
import { getNpsConfig, saveNpsConfig } from "@/lib/nps.functions";
import { extractDominantColor, extractDominantColorFromUrl } from "@/lib/color-utils";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({ meta: [{ title: `${brand.name} — Configurações` }] }),
  beforeLoad: ({ context }: any) => {
    const r = context?.membership?.role;
    if (r === "atendente" || r === "supervisor") throw redirect({ to: "/app/dashboard" });
  },
  component: ConfigPage,
});


function ConfigPage() {
  const ctx = Route.useRouteContext();
  const companyId = ctx.company?.id;
  const userId = ctx.user.id;
  const company = ctx.company;

  const [empresa, setEmpresa] = useState({ nome: "", telefone: "" });
  const [identidade, setIdentidade] = useState({ primary_color: "#67308E", logo_url: "", nome_fantasia: "" });
  const [detectedColor, setDetectedColor] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [perfil, setPerfil] = useState({ nome: "", email: ctx.user.email ?? "" });
  const [senha, setSenha] = useState({ nova: "", confirma: "" });
  const [savingE, setSavingE] = useState(false);
  const [savingI, setSavingI] = useState(false);
  const [savingP, setSavingP] = useState(false);
  const [savingS, setSavingS] = useState(false);
  const [sub, setSub] = useState<any>(null);

  useEffect(() => {
    if (ctx.company) {
      setEmpresa({ nome: ctx.company.nome, telefone: ctx.company.telefone ?? "" });
      setIdentidade({
        primary_color: ctx.company.primary_color,
        logo_url: ctx.company.logo_url ?? "",
        nome_fantasia: ctx.company.nome_fantasia ?? "",
      });
    }
    void (async () => {
      const { data } = await supabase.from("profiles").select("nome").eq("user_id", userId).maybeSingle();
      if (data) setPerfil((p) => ({ ...p, nome: data.nome ?? "" }));
    })();
    if (companyId) {
      void (async () => {
        const { data } = await supabase
          .from("subscription")
          .select("*, plan:plan(id,nome,preco_cents,moeda,intervalo)")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setSub(data);
      })();
    }
  }, [companyId, userId]);

  async function saveEmpresa() {
    if (!companyId) return;
    setSavingE(true);
    const { error } = await supabase.from("company").update({ nome: empresa.nome, telefone: empresa.telefone || null }).eq("id", companyId);
    setSavingE(false);
    if (error) return toast.error(error.message);
    toast.success("Empresa atualizada"); setTimeout(() => location.reload(), 500);
  }

  async function saveIdentidade() {
    if (!companyId) return;
    setSavingI(true);
    const { error } = await supabase.from("company").update({
      primary_color: identidade.primary_color,
      logo_url: identidade.logo_url || null,
      nome_fantasia: identidade.nome_fantasia || null,
    }).eq("id", companyId);
    setSavingI(false);
    if (error) return toast.error(error.message);
    toast.success("Identidade atualizada"); setTimeout(() => location.reload(), 500);
  }

  async function detectarCor() {
    if (!identidade.logo_url) return;
    setDetecting(true);
    setDetectedColor(null);
    const cor = await extractDominantColorFromUrl(identidade.logo_url);
    setDetecting(false);
    if (!cor) {
      toast.error("Não consegui identificar uma cor confiável nessa logo. Tente outra imagem ou escolha manualmente.");
      return;
    }
    setDetectedColor(cor);
  }

  function usarCorDetectada() {
    if (!detectedColor) return;
    setIdentidade((p) => ({ ...p, primary_color: detectedColor }));
    setDetectedColor(null);
    toast.success("Cor aplicada. Clique em Salvar para confirmar.");
  }

  async function onLogoFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !companyId) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máximo 3MB).");
      return;
    }

    setUploadingLogo(true);
    setDetectedColor(null);
    try {
      // Extrai a cor localmente, direto do arquivo — sem depender de rede/CORS.
      const localUrl = URL.createObjectURL(file);
      const img = new Image();
      const cor = await new Promise<string | null>((resolve) => {
        img.onload = () => resolve(extractDominantColor(img));
        img.onerror = () => resolve(null);
        img.src = localUrl;
      });
      URL.revokeObjectURL(localUrl);

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${companyId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("company-logos").getPublicUrl(path);
      // Evita cache de navegador servindo a logo antiga no mesmo nome de arquivo.
      const logoUrl = `${pub.publicUrl}?v=${Date.now()}`;

      setIdentidade((p) => ({ ...p, logo_url: logoUrl }));
      if (cor) setDetectedColor(cor);
      toast.success("Logo enviada. Clique em Salvar para confirmar.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao enviar a logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function savePerfil() {
    setSavingP(true);
    const { error } = await supabase.from("profiles").update({ nome: perfil.nome || null }).eq("user_id", userId);
    setSavingP(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil atualizado");
  }

  async function saveSenha() {
    if (senha.nova.length < 8) return toast.error("Mínimo 8 caracteres");
    if (senha.nova !== senha.confirma) return toast.error("Senhas não conferem");
    setSavingS(true);
    const { error } = await supabase.auth.updateUser({ password: senha.nova });
    setSavingS(false);
    if (error) return toast.error(error.message);
    setSenha({ nova: "", confirma: "" });
    toast.success("Senha alterada");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Empresa, identidade e perfil.</p>
      </div>
      <Tabs defaultValue="plano">
        <TabsList>
          <TabsTrigger value="plano">Plano</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="identidade">Identidade</TabsTrigger>
          <TabsTrigger value="campos">Campos</TabsTrigger>
          <TabsTrigger value="nps">NPS</TabsTrigger>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
        </TabsList>

        <TabsContent value="plano">
          <PlanoCard company={company} sub={sub} />
        </TabsContent>

        <TabsContent value="empresa">
          <Card className="p-5 space-y-4 max-w-xl">
            <div><Label>Nome da empresa</Label><Input value={empresa.nome} onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={empresa.telefone} onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })} /></div>
            <div className="flex justify-end">
              <Button onClick={saveEmpresa} disabled={savingE}>
                {savingE ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />} Salvar
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="identidade">
          <Card className="p-5 space-y-4 max-w-xl">
            <div>
              <Label>Nome de exibição</Label>
              <Input
                value={identidade.nome_fantasia}
                onChange={(e) => setIdentidade({ ...identidade, nome_fantasia: e.target.value })}
                placeholder={`Aparece no lugar de "${brand.name}" no menu lateral`}
              />
              <p className="text-xs text-muted-foreground mt-1">Se deixar em branco, usa o nome da empresa.</p>
            </div>
            <div>
              <Label>Logo da empresa</Label>
              <div className="flex items-center gap-3 mt-1">
                {identidade.logo_url && (
                  <img src={identidade.logo_url} alt="logo" className="size-16 rounded object-cover border shrink-0" />
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-md border border-input bg-background hover:bg-accent cursor-pointer w-fit">
                    {uploadingLogo ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    {uploadingLogo ? "Enviando…" : "Enviar arquivo (PNG, JPG, SVG — até 3MB)"}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onLogoFileSelected} disabled={uploadingLogo} />
                  </label>
                  <p className="text-xs text-muted-foreground">A cor é detectada automaticamente ao enviar o arquivo.</p>
                </div>
              </div>

              <details className="mt-2">
                <summary className="text-xs text-muted-foreground cursor-pointer select-none">Já tenho a logo hospedada em outro link</summary>
                <div className="mt-2 flex items-center gap-2">
                  <Input value={identidade.logo_url} onChange={(e) => { setIdentidade({ ...identidade, logo_url: e.target.value }); setDetectedColor(null); }} placeholder="https://…" />
                  <Button type="button" variant="outline" size="sm" onClick={detectarCor} disabled={detecting || !identidade.logo_url}>
                    {detecting ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
                    Detectar cor
                  </Button>
                </div>
              </details>
            </div>

            {detectedColor && (
              <div className="rounded-xl border border-[color:var(--brand-soft-strong)] bg-[color:var(--brand-soft)] p-3.5 flex items-center gap-3">
                <div className="size-10 rounded-lg border shrink-0" style={{ background: detectedColor }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Detectamos essa cor na sua logo</div>
                  <div className="text-xs text-muted-foreground">{detectedColor} — confirma pra aplicar em todo o sistema?</div>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setDetectedColor(null)}>Manter atual</Button>
                <Button type="button" size="sm" onClick={usarCorDetectada}>Usar essa cor</Button>
              </div>
            )}

            <div>
              <Label>Cor primária</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={identidade.primary_color} onChange={(e) => setIdentidade({ ...identidade, primary_color: e.target.value })} className="h-10 w-14 rounded border" />
                <Input value={identidade.primary_color} onChange={(e) => setIdentidade({ ...identidade, primary_color: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={saveIdentidade} disabled={savingI}>
                {savingI ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />} Salvar
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="campos">
          <CamposPersonalizados />
        </TabsContent>

        <TabsContent value="nps">
          <NpsConfigCard />
        </TabsContent>

        <TabsContent value="perfil">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold">Meus dados</h2>
              <div><Label>Email</Label><Input value={perfil.email} disabled /></div>
              <div><Label>Nome</Label><Input value={perfil.nome} onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })} /></div>
              <div className="flex justify-end">
                <Button onClick={savePerfil} disabled={savingP}>
                  {savingP ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />} Salvar
                </Button>
              </div>
            </Card>
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold">Trocar senha</h2>
              <div><Label>Nova senha</Label><Input type="password" value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} /></div>
              <div><Label>Confirmar</Label><Input type="password" value={senha.confirma} onChange={(e) => setSenha({ ...senha, confirma: e.target.value })} /></div>
              <div className="flex justify-end">
                <Button onClick={saveSenha} disabled={savingS}>
                  {savingS ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />} Trocar
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const TIPO_LABELS: Record<string, string> = {
  texto: "Texto", numero: "Número", data: "Data", booleano: "Sim/Não", selecao: "Seleção",
};

function CamposPersonalizados() {
  const listFn = useServerFn(listFieldDefs);
  const upsertFn = useServerFn(upsertFieldDef);
  const deleteFn = useServerFn(deleteFieldDef);
  const [defs, setDefs] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ nome: "", tipo: "texto", opcoes: "", obrigatorio: false });
  const [saving, setSaving] = useState(false);

  async function load() { setDefs((await listFn()) as any[]); }
  useEffect(() => { void load(); }, []);

  function startNew() {
    setEditId("__new");
    setDraft({ nome: "", tipo: "texto", opcoes: "", obrigatorio: false });
  }

  function startEdit(def: any) {
    setEditId(def.id);
    setDraft({ nome: def.nome, tipo: def.tipo, opcoes: (def.opcoes ?? []).join(", "), obrigatorio: def.obrigatorio });
  }

  async function handleSave() {
    if (!draft.nome.trim()) return toast.error("Nome é obrigatório");
    setSaving(true);
    try {
      await upsertFn({
        data: {
          ...(editId !== "__new" ? { id: editId! } : {}),
          nome: draft.nome.trim(),
          tipo: draft.tipo as any,
          opcoes: draft.tipo === "selecao" ? draft.opcoes.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
          obrigatorio: draft.obrigatorio,
          ordem: defs.length,
        },
      });
      toast.success("Campo salvo");
      setEditId(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este campo? Os valores preenchidos serão perdidos.")) return;
    try {
      await deleteFn({ data: { id } });
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao remover");
    }
  }

  return (
    <Card className="p-5 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Campos personalizados</h2>
          <p className="text-sm text-muted-foreground">Campos extras que aparecem na ficha de cada contato.</p>
        </div>
        <Button size="sm" onClick={startNew} disabled={editId === "__new"}>
          <Plus className="size-4 mr-1.5" /> Novo campo
        </Button>
      </div>

      {/* Formulário de criação/edição */}
      {editId && (
        <div className="border border-[color:var(--hairline)] rounded-xl p-4 space-y-3 bg-[color:var(--panel-2)]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome do campo</Label>
              <Input value={draft.nome} onChange={(e) => setDraft((d) => ({ ...d, nome: e.target.value }))} placeholder="Ex: CNPJ, Cidade, Produto…" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={draft.tipo} onValueChange={(v) => setDraft((d) => ({ ...d, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {draft.tipo === "selecao" && (
            <div className="space-y-1.5">
              <Label>Opções (separadas por vírgula)</Label>
              <Input value={draft.opcoes} onChange={(e) => setDraft((d) => ({ ...d, opcoes: e.target.value }))} placeholder="Opção 1, Opção 2, Opção 3" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Switch checked={draft.obrigatorio} onCheckedChange={(c) => setDraft((d) => ({ ...d, obrigatorio: c }))} />
            <Label>Campo obrigatório</Label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />} Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Lista de campos existentes */}
      {defs.length === 0 && !editId ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum campo cadastrado.</p>
      ) : (
        <ul className="divide-y divide-[color:var(--hairline)]">
          {defs.map((def) => (
            <li key={def.id} className="flex items-center gap-3 py-3">
              <GripVertical className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{def.nome}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {TIPO_LABELS[def.tipo] ?? def.tipo}
                  {def.obrigatorio && <Badge variant="secondary" className="text-[9px] py-0">Obrigatório</Badge>}
                  {def.tipo === "selecao" && def.opcoes?.length > 0 && (
                    <span>· {def.opcoes.slice(0, 3).join(", ")}{def.opcoes.length > 3 ? "…" : ""}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => startEdit(def)}>Editar</Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:text-red-500" onClick={() => void handleDelete(def.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function NpsConfigCard() {
  const getFn = useServerFn(getNpsConfig);
  const saveFn = useServerFn(saveNpsConfig);
  const [cfg, setCfg] = useState({ ativo: false, mensagem: "Como você avalia seu atendimento de 1 a 10?", delay_minutos: 5 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { void getFn().then((d: any) => setCfg(d)); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await saveFn({ data: cfg });
      toast.success("Configuração de NPS salva");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 space-y-4 max-w-xl">
      <div>
        <h2 className="font-semibold">Avaliação NPS</h2>
        <p className="text-sm text-muted-foreground">Envia uma mensagem de avaliação ao cliente após encerrar o atendimento.</p>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-[color:var(--panel-2)] border border-[color:var(--hairline)]">
        <Switch checked={cfg.ativo} onCheckedChange={(c) => setCfg((p) => ({ ...p, ativo: c }))} />
        <Label>Envio automático de NPS ativo</Label>
      </div>
      <div className="space-y-1.5">
        <Label>Mensagem enviada ao cliente</Label>
        <textarea
          value={cfg.mensagem}
          onChange={(e) => setCfg((p) => ({ ...p, mensagem: e.target.value }))}
          rows={3}
          maxLength={500}
          className="w-full bg-[color:var(--panel-2)] border border-[color:var(--hairline)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[color:var(--brand)]/60 resize-none"
          placeholder="Como você avalia seu atendimento de 1 a 10?"
        />
        <p className="text-[11px] text-muted-foreground">A resposta deve ser um número de 0 a 10.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Delay após encerramento (minutos)</Label>
        <Input
          type="number" min={0} max={1440}
          value={cfg.delay_minutos}
          onChange={(e) => setCfg((p) => ({ ...p, delay_minutos: Number(e.target.value) }))}
          className="w-32"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />} Salvar
        </Button>
      </div>
    </Card>
  );
}

function fmtBRL(cents: number, moeda = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(cents / 100);
}

function PlanoCard({ company, sub }: { company: any; sub: any }) {
  const status = company?.status_cobranca as string | undefined;
  const trialEnd = sub?.trial_ends_at ?? company?.trial_ate ?? null;
  const days = trialEnd ? trialDaysLeft(trialEnd) : 0;
  const isTrial = status === "trial" || sub?.status === "trialing";
  const isActive = status === "ativo" || sub?.status === "active";
  const isExpired = isTrial && days <= 0;

  return (
    <div className="grid md:grid-cols-2 gap-4 max-w-3xl">
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Plano atual</h2>
          {isActive ? (
            <Badge className="bg-emerald-600">Ativo</Badge>
          ) : isTrial ? (
            <Badge variant={isExpired ? "destructive" : "secondary"}>
              {isExpired ? "Trial expirado" : "Em teste"}
            </Badge>
          ) : (
            <Badge variant="destructive">Inativo</Badge>
          )}
        </div>
        {sub?.plan ? (
          <>
            <div className="text-2xl font-bold">{sub.plan.nome}</div>
            <div className="text-sm text-muted-foreground">
              {fmtBRL(sub.plan.preco_cents, sub.plan.moeda)}/{sub.plan.intervalo === "month" ? "mês" : "ano"}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Nenhum plano vinculado ainda.</div>
        )}

        {isTrial && (
          <div className={`rounded-md p-3 text-sm flex items-start gap-2 ${
            isExpired ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
          }`}>
            {isExpired ? <AlertTriangle className="size-4 mt-0.5" /> : <Sparkles className="size-4 mt-0.5" />}
            <div>
              {isExpired ? (
                <>Seu período de teste terminou. Cadastre o cartão para continuar usando.</>
              ) : (
                <>Restam <b>{days} {days === 1 ? "dia" : "dias"}</b> de teste. Cadastre o cartão antes do fim do prazo para não interromper.</>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="font-semibold">Gerenciar pagamento</h2>
        <p className="text-sm text-muted-foreground">
          {isActive
            ? "Você pode trocar de plano ou atualizar o cartão a qualquer momento."
            : "Cadastre seu cartão para ativar o plano. Pode cancelar quando quiser."}
        </p>
        {sub?.payment_method_brand && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="size-3.5" /> {sub.payment_method_brand} •••• {sub.payment_method_last4}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild>
            <Link to="/app/checkout" search={{ plano: sub?.plan?.nome?.toLowerCase() } as any}>
              <CreditCard className="size-4 mr-1.5" />
              {isActive ? "Trocar de plano" : "Cadastrar cartão e ativar"}
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
