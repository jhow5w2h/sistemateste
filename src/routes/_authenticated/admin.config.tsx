import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errMsg } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/config")({ component: Config });

const DEFAULT_COLORS = { color_1: "#f59a3c", color_2: "#e8336f", color_3: "#7a2fb0" };

function Config() {
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data,
  });
  const [f, setF] = useState({ receiver_name: "", support_whatsapp: "", payment_message: "" });
  const [atl, setAtl] = useState("");
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) {
      setF({ receiver_name: data.receiver_name, support_whatsapp: data.support_whatsapp, payment_message: data.payment_message });
      setAtl((data.atleticas ?? []).join("\n"));
      setColors({
        color_1: data.color_1 || DEFAULT_COLORS.color_1,
        color_2: data.color_2 || DEFAULT_COLORS.color_2,
        color_3: data.color_3 || DEFAULT_COLORS.color_3,
      });
    }
  }, [data]);

  const update = async (patch: Database["public"]["Tables"]["settings"]["Update"], msg: string) => {
    const { error } = await supabase.from("settings").update(patch).eq("id", 1);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(msg);
    refetch();
    qc.invalidateQueries({ queryKey: ["branding"] });
    qc.invalidateQueries({ queryKey: ["atleticas"] });
  };

  const save = () =>
    update({ ...f, atleticas: atl.split("\n").map((s) => s.trim()).filter(Boolean) }, "Configurações salvas");

  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) { toast.error("Envie uma imagem de até 3 MB"); return; }
    setBusy(true);
    const path = `logo/${Date.now()}-${file.name.replace(/[^\w.]/g, "")}`;
    const { error } = await supabase.storage.from("posters").upload(path, file);
    if (error) { setBusy(false); toast.error(errMsg(error)); return; }
    const { data: s } = await supabase.storage.from("posters").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    setBusy(false);
    update({ logo_url: s?.signedUrl ?? null }, "Logo atualizada");
  };

  return (
    <div className="max-w-lg space-y-8">
      <section className="space-y-4">
        <h2 className="text-3xl">Visual do site</h2>
        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-32 items-center justify-center rounded-md border border-border bg-card">
              {data?.logo_url ? <img src={data.logo_url} alt="Logo" className="max-h-14 max-w-28" /> : <span className="text-xs text-muted-foreground">Texto padrão</span>}
            </div>
            <Input type="file" accept="image/*" disabled={busy} onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
          </div>
          {data?.logo_url && <Button size="sm" variant="ghost" onClick={() => update({ logo_url: null }, "Logo removida")}>Remover logo</Button>}
        </div>
        <div className="space-y-2">
          <Label>Cores (degradê)</Label>
          <div className="flex gap-4">
            {(["color_1", "color_2", "color_3"] as const).map((k, i) => (
              <label key={k} className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                <input type="color" className="h-12 w-12 cursor-pointer rounded border border-border bg-transparent" value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} />
                {["Principal", "Meio", "Final"][i]}
              </label>
            ))}
          </div>
          <div className="h-3 rounded-full" style={{ background: `linear-gradient(100deg, ${colors.color_1}, ${colors.color_2}, ${colors.color_3})` }} />
          <div className="flex gap-2">
            <Button variant="sunset" onClick={() => update(colors, "Cores salvas")}>Salvar cores</Button>
            <Button variant="ghost" onClick={() => update({ color_1: null, color_2: null, color_3: null }, "Cores padrão restauradas")}>Restaurar padrão</Button>
          </div>
        </div>
      </section>
      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="text-3xl">Configurações</h2>
        <div className="space-y-1.5"><Label>Nome do recebedor</Label><Input value={f.receiver_name} onChange={(e) => setF({ ...f, receiver_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>WhatsApp de suporte</Label><Input value={f.support_whatsapp} onChange={(e) => setF({ ...f, support_whatsapp: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Mensagem na tela de pagamento</Label><Textarea value={f.payment_message} onChange={(e) => setF({ ...f, payment_message: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Atléticas (uma por linha)</Label><Textarea rows={6} placeholder={"Atlética Medicina\nAtlética Direito"} value={atl} onChange={(e) => setAtl(e.target.value)} /><p className="text-xs text-muted-foreground">Viram uma lista para escolher na compra. Vazio = a pessoa digita.</p></div>
        <Button variant="sunset" onClick={save}>Salvar</Button>
      </section>
    </div>
  );
}
