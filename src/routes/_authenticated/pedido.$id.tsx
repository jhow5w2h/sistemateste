import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function OrderPage() {
  const { id } = Route.useParams();
  const [cpf, setCpf] = useState("");
  const [paying, setPaying] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    // enquanto aguarda pagamento, confere o status a cada 5 segundos
    refetchInterval: (q) =>
      q.state.data?.o?.status === "aguardando_pagamento" ? 5000 : false,
    queryFn: async () => {
      const { data: o, error } = await supabase
        .from("orders")
        .select("*, events(name, event_date, event_time, location), ticket_types(name)")
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

  const pay = async () => {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) {
      toast.error("Informe um CPF válido");
      return;
    }
    setPaying(true);
    // abre a aba já no clique, senão o navegador bloqueia o pop-up
    const win = window.open("about:blank", "_blank");
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");
      const r = await fetch("/api/asaas/criar-pix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: o.id, cpf: digits }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.invoiceUrl) throw new Error(j.error ?? "Não foi possível gerar o pagamento");
      if (win) win.location.href = j.invoiceUrl;
      else window.location.href = j.invoiceUrl;
    } catch (e) {
      win?.close();
      toast.error(errMsg(e));
    } finally {
      setPaying(false);
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
          <div className="space-y-2">
            <label className="text-sm" htmlFor="cpf">CPF do comprador</label>
            <Input
              id="cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
            />
          </div>
          <Button variant="sunset" className="h-14 w-full text-lg" disabled={paying} onClick={pay}>
            {paying ? "Abrindo pagamento…" : "Pagar agora"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Pix, cartão de crédito ou débito. A confirmação é automática.
          </p>
          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            Depois de pagar, volte para esta tela. Ela atualiza sozinha e seu ingresso aparece
            assim que o pagamento for confirmado.
          </p>
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
