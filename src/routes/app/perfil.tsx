import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({ meta: [{ title: `${brand.name} — Meu Perfil` }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const ctx = Route.useRouteContext();
  const userId = ctx.user.id;

  const [perfil, setPerfil] = useState({ nome: "", email: ctx.user.email ?? "" });
  const [senha, setSenha] = useState({ nova: "", confirma: "" });
  const [savingP, setSavingP] = useState(false);
  const [savingS, setSavingS] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("profiles").select("nome").eq("user_id", userId).maybeSingle();
      if (data) setPerfil((p) => ({ ...p, nome: data.nome ?? "" }));
    })();
  }, [userId]);

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
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Seus dados de acesso.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
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
    </div>
  );
}
