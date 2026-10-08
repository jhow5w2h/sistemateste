import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { brl, dateTimeBR, errMsg, waLink } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({ component: OrdersAdmin });

type Status = "aguardando_pagamento" | "pago" | "cancelado";

function OrdersAdmin() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<Status | "todos">("aguardando_pagamento");
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("*, events(name), ticket_types(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set(orders.map((o) => o.user_id))];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name, whatsapp").in("id", ids)
        : { data: [] };
      const pm = new Map((profiles ?? []).map((p) => [p.id, p]));
      return orders.map((o) => ({ ...o, profile: pm.get(o.user_id) }));
    },
  });

  const run = async (fn: "mark_order_paid" | "revert_order_paid" | "cancel_order", id: string, msg: string): Promise<void> => {
    const { error } = await supabase.rpc(fn, { _order_id: id });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(msg);
    qc.invalidateQueries();
  };

  const openReceipt = async (path: string) => {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 300);
    if (data) window.open(data.signedUrl, "_blank");
  };

  const rows = (data ?? []).filter(
    (o) =>
      (status === "todos" || o.status === status) &&
      (o.profile?.full_name ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <h2 className="mb-4 text-3xl">Pedidos</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["aguardando_pagamento", "pago", "cancelado", "todos"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-bold uppercase",
              status === s ? "border-primary text-primary" : "border-border text-muted-foreground",
            )}
          >
            {s === "aguardando_pagamento" ? "Aguardando" : s}
          </button>
        ))}
        <Input className="max-w-xs" placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="space-y-2">
        {rows.map((o) => (
          <div key={o.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{o.profile?.full_name || "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {o.profile?.whatsapp} · {o.events?.name} · {o.quantity}× {o.ticket_types?.name} · {dateTimeBR(o.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold">{brl(o.total)}</span>
                <StatusBadge status={o.status} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {o.receipt_path && (
                <Button size="sm" variant="outline" onClick={() => openReceipt(o.receipt_path!)}>Ver comprovante</Button>
              )}
              {o.status === "aguardando_pagamento" && (
                <>
                  <Button size="sm" variant="success" onClick={() => run("mark_order_paid", o.id, "Pagamento confirmado")}>
                    Dar baixa (marcar como pago)
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm("Cancelar pedido e devolver estoque?") && run("cancel_order", o.id, "Pedido cancelado")}>
                    Cancelar
                  </Button>
                </>
              )}
              {o.status === "pago" && (
                <>
                  {o.profile?.whatsapp && (
                    <Button size="sm" variant="success" asChild>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        href={waLink(o.profile.whatsapp, `Pagamento confirmado! Seu nome está na lista do ${o.events?.name}.`)}
                      >
                        Avisar no WhatsApp
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => confirm("Reverter a baixa?") && run("revert_order_paid", o.id, "Baixa revertida")}>
                    Reverter baixa
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm("Cancelar pedido e devolver estoque?") && run("cancel_order", o.id, "Pedido cancelado")}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted-foreground">Nenhum pedido.</p>}
      </div>
    </div>
  );
}
