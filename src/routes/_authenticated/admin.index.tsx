import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({ component: Dashboard });

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dash"],
    queryFn: async () => {
      const [{ data: events }, { data: orders }, { data: tickets }] = await Promise.all([
        supabase.from("events").select("id, name").neq("status", "arquivado").order("event_date"),
        supabase.from("orders").select("event_id, status, total, quantity"),
        supabase.from("tickets").select("event_id, checked_in_at"),
      ]);
      return (events ?? []).map((e) => {
        const os = (orders ?? []).filter((o) => o.event_id === e.id);
        const paid = os.filter((o) => o.status === "pago");
        const ts = (tickets ?? []).filter((t) => t.event_id === e.id);
        return {
          ...e,
          sold: paid.reduce((s, o) => s + o.quantity, 0),
          revenue: paid.reduce((s, o) => s + Number(o.total), 0),
          pending: os.filter((o) => o.status === "aguardando_pagamento").length,
          checkins: ts.filter((t) => t.checked_in_at).length,
        };
      });
    },
  });

  return (
    <div className="space-y-6">
      {data?.map((e) => (
        <section key={e.id}>
          <h2 className="mb-3 text-2xl">{e.name}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Ingressos pagos" value={e.sold} />
            <Stat label="Receita confirmada" value={brl(e.revenue)} />
            <Stat label="Aguardando pagamento" value={e.pending} />
            <Stat label="Check-ins" value={`${e.checkins}/${e.sold}`} />
          </div>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
