import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { brl, dateBR, errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/eventos")({ component: EventsAdmin });

type Ev = Tables<"events">;
type TT = Tables<"ticket_types">;

function EventsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Ev> | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { data: events } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => (await supabase.from("events").select("*").order("event_date", { ascending: false })).data ?? [],
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-events"] });
    qc.invalidateQueries({ queryKey: ["events-public"] });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-3xl">Eventos</h2>
        <Button variant="sunset" onClick={() => setEditing({ status: "ativo" })}>+ Novo evento</Button>
      </div>
      {editing && <EventForm ev={editing} onDone={() => { setEditing(null); refresh(); }} />}
      <div className="space-y-3">
        {events?.map((e) => (
          <div key={e.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-display text-2xl">{e.name}</div>
                <div className="text-xs text-muted-foreground">
                  {dateBR(e.event_date)} · {e.event_time} · {e.location} · <b className="uppercase">{e.status}</b>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setEditing(e)}>Editar</Button>
                <Button size="sm" variant="secondary" onClick={() => setOpen(open === e.id ? null : e.id)}>Ingressos</Button>
                {(["ativo", "inativo", "arquivado"] as const).filter((s) => s !== e.status).map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={async () => {
                    await supabase.from("events").update({ status: s }).eq("id", e.id);
                    refresh();
                  }}>
                    {s === "ativo" ? "Ativar" : s === "inativo" ? "Desativar" : "Arquivar"}
                  </Button>
                ))}
              </div>
            </div>
            {open === e.id && <TicketTypes eventId={e.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function EventForm({ ev, onDone }: { ev: Partial<Ev>; onDone: () => void }) {
  const [f, setF] = useState(ev);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async (): Promise<void> => {
    if (!f.name || !f.event_date) { toast.error("Nome e data são obrigatórios"); return; }
    setBusy(true);
    try {
      let poster_url = f.poster_url ?? null;
      if (file) {
        const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
        const { error } = await supabase.storage.from("posters").upload(path, file);
        if (error) throw error;
        const { data } = await supabase.storage.from("posters").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        poster_url = data?.signedUrl ?? null;
      }
      const payload = {
        name: f.name, description: f.description ?? "", event_date: f.event_date,
        event_time: f.event_time ?? "", location: f.location ?? "", status: f.status ?? "ativo", poster_url,
      };
      const { error } = f.id
        ? await supabase.from("events").update(payload).eq("id", f.id)
        : await supabase.from("events").insert(payload);
      if (error) throw error;
      toast.success("Evento salvo");
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-6 grid gap-3 rounded-lg border border-primary bg-card p-4 md:grid-cols-2">
      <Field label="Nome"><Input value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Local"><Input value={f.location ?? ""} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
      <Field label="Data"><Input type="date" value={f.event_date ?? ""} onChange={(e) => setF({ ...f, event_date: e.target.value })} /></Field>
      <Field label="Hora"><Input type="time" value={f.event_time ?? ""} onChange={(e) => setF({ ...f, event_time: e.target.value })} /></Field>
      <div className="md:col-span-2"><Field label="Descrição"><Textarea value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
      <Field label="Cartaz"><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
      <div className="flex items-end gap-2">
        <Button variant="sunset" disabled={busy} onClick={save}>Salvar</Button>
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function TicketTypes({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const key = ["admin-tt", eventId];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("ticket_types").select("*").eq("event_id", eventId).order("price")).data ?? [],
  });
  const [n, setN] = useState({ name: "", price: "", total_quantity: "", payment_link: "" });
  const add = async (): Promise<void> => {
    if (!n.name) return;
    const { error } = await supabase.from("ticket_types").insert({
      event_id: eventId, name: n.name, price: Number(n.price || 0),
      total_quantity: Number(n.total_quantity || 0), payment_link: n.payment_link || null,
    });
    if (error) { toast.error(errMsg(error)); return; }
    setN({ name: "", price: "", total_quantity: "", payment_link: "" });
    qc.invalidateQueries({ queryKey: key });
  };
  return (
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      {data?.map((t) => <TTRow key={t.id} t={t} onChange={() => qc.invalidateQueries({ queryKey: key })} />)}
      <div className="grid gap-2 rounded-md bg-muted p-3 md:grid-cols-5">
        <Input placeholder="Nome (ex: Lote 2)" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
        <Input placeholder="Preço" type="number" value={n.price} onChange={(e) => setN({ ...n, price: e.target.value })} />
        <Input placeholder="Quantidade" type="number" value={n.total_quantity} onChange={(e) => setN({ ...n, total_quantity: e.target.value })} />
        <Input placeholder="Link de pagamento C6" value={n.payment_link} onChange={(e) => setN({ ...n, payment_link: e.target.value })} />
        <Button onClick={add}>+ Adicionar</Button>
      </div>
    </div>
  );
}

function TTRow({ t, onChange }: { t: TT; onChange: () => void }) {
  const [f, setF] = useState({ name: t.name, price: String(t.price), total_quantity: String(t.total_quantity), payment_link: t.payment_link ?? "" });
  const save = async (patch: Partial<TT>) => {
    const { error } = await supabase.from("ticket_types").update(patch).eq("id", t.id);
    if (error) toast.error(errMsg(error)); else { toast.success("Salvo"); onChange(); }
  };
  const soldOut = t.sold >= t.total_quantity;
  return (
    <div className="grid items-center gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_90px_90px_2fr_auto_auto]">
      <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      <Input type="number" value={f.total_quantity} onChange={(e) => setF({ ...f, total_quantity: e.target.value })} />
      <Input placeholder="Link C6" value={f.payment_link} onChange={(e) => setF({ ...f, payment_link: e.target.value })} />
      <div className="flex items-center gap-2 text-xs">
        <Switch checked={t.active} onCheckedChange={(v) => save({ active: v })} />
        <span>{t.sold}/{t.total_quantity} {soldOut ? "· ESGOTADO" : ""} · {brl(t.price)}</span>
      </div>
      <Button size="sm" onClick={() => save({
        name: f.name, price: Number(f.price), total_quantity: Number(f.total_quantity), payment_link: f.payment_link || null,
      })}>Salvar</Button>
    </div>
  );
}
