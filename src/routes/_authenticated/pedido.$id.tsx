import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { brl, dateBR, errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Seu pedido — ÁREA 42" },
      { name: "description", content: "Pagamento e ingresso do seu pedido." },
      { property: "og:title", content: "Seu pedido — ÁREA 42" },
      { property: "og:description", content: "Pagamento e ingresso do seu pedido." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data: o, error } = await supabase
        .from("orders")
        .select("*, events(name, event_date, event_time, location), ticket_types(name, payment_link)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      const [{ data: tickets }, { data: profile }, { data: settings }] = await Promise.all([
        supabase.from("tickets").select("*").eq("order_id", id),
        supabase.from("profiles").select("full_name").eq("id", o?.user_id ?? "").maybeSingle(),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      return { o, tickets: tickets ?? [], profile, settings };
    },
  });

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando…</p>;
  if (!data?.o) return <p className="p-6">Pedido não encontrado.</p>;
  const { o, tickets, profile, settings } = data;

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const path = `${u.user!.id}/${o.id}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file);
      if (error) throw error;
      const { error: e2 } = await supabase.rpc("set_order_receipt", { _order_id: o.id, _path: path });
      if (e2) throw e2;
      toast.success("Comprovante enviado!");
      qc.invalidateQueries({ queryKey: ["order", id] });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="flex items-center justify-between">
        <StatusBadge status={o.status} />
        <span className="text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</span>
      </div>
      <h1 className="mt-3 text-5xl">{o.events?.name}</h1>
      <p className="text-sm text-primary">
        {o.events && dateBR(o.events.event_date)} · {o.events?.event_time} · {o.events?.location}
      </p>
      <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <span className="text-sm">{o.quantity}× {o.ticket_types?.name}</span>
        <span className="text-3xl font-bold">{brl(o.total)}</span>
      </div>

      {o.status === "aguardando_pagamento" && (
        <div className="mt-6 space-y-4">
          {o.ticket_types?.payment_link && (
            <Button asChild variant="sunset" className="h-14 w-full text-lg">
              <a href={o.ticket_types.payment_link} target="_blank" rel="noopener noreferrer">Pagar agora</a>
            </Button>
          )}
          {settings?.payment_message && <p className="text-sm text-muted-foreground">{settings.payment_message}</p>}
          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            Depois de pagar, aguarde a confirmação. Seu nome entra na lista assim que a BECO42 confirmar.
          </p>
          <label className="block rounded-md border border-dashed border-border p-4 text-center text-sm">
            {o.receipt_path ? "✓ Comprovante enviado — enviar outro" : "Enviar comprovante (opcional)"}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            {uploading && <span className="mt-1 block text-muted-foreground">Enviando…</span>}
          </label>
          {settings?.support_whatsapp && (
            <a
              className="block text-center text-xs text-muted-foreground underline"
              href={`https://wa.me/${settings.support_whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar com o suporte
            </a>
          )}
        </div>
      )}

      {o.status === "pago" && (
        <div className="mt-6 space-y-4">
          <p className="text-center font-display text-3xl text-sunset">Seu nome está na lista</p>
          {tickets.map((t, i) => (
            <div key={t.id} className="rounded-lg bg-foreground p-5 text-center text-background">
              <QRCodeSVG value={t.code} size={200} className="mx-auto" />
              <div className="mt-3 font-display text-xl">{profile?.full_name}</div>
              <div className="text-xs tracking-widest">
                {o.ticket_types?.name} · {i + 1}/{tickets.length} · {t.code}
              </div>
              {t.checked_in_at && <div className="mt-2 text-xs font-bold">ENTRADA REGISTRADA</div>}
            </div>
          ))}
        </div>
      )}

      {o.status === "cancelado" && (
        <p className="mt-6 text-sm text-muted-foreground">Este pedido foi cancelado.</p>
      )}
    </main>
  );
}
