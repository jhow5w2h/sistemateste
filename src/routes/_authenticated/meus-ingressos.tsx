import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/meus-ingressos")({
  head: () => ({
    meta: [
      { title: "Meus ingressos — ÁREA 42" },
      { name: "description", content: "Acompanhe seus pedidos e ingressos." },
      { property: "og:title", content: "Meus ingressos — ÁREA 42" },
      { property: "og:description", content: "Acompanhe seus pedidos e ingressos." },
    ],
  }),
  component: MyTickets,
});

function MyTickets() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("orders")
        .select("*, events(name, event_date, event_time, location), ticket_types(name)")
        .eq("user_id", u.user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-5xl">Meus ingressos</h1>
      {isLoading && <p className="mt-6 text-muted-foreground">Carregando…</p>}
      {data?.length === 0 && (
        <p className="mt-6 text-muted-foreground">
          Você ainda não tem pedidos. <Link to="/" className="text-primary underline">Ver eventos</Link>
        </p>
      )}
      <div className="mt-6 space-y-3">
        {data?.map((o) => (
          <Link
            key={o.id}
            to="/pedido/$id"
            params={{ id: o.id }}
            className="block rounded-lg border border-border bg-card p-4 transition hover:border-primary"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-2xl">{o.events?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {o.events && dateBR(o.events.event_date)} · {o.quantity}× {o.ticket_types?.name}
                </div>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="mt-2 text-right font-bold">{brl(o.total)}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
