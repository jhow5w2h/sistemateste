import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl, dateBR, errMsg } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/evento/$id")({
  head: () => ({
    meta: [
      { title: "Evento — ÁREA 42" },
      { name: "description", content: "Detalhes do evento e tipos de ingresso." },
      { property: "og:title", content: "Evento — ÁREA 42" },
      { property: "og:description", content: "Detalhes do evento e tipos de ingresso." },
    ],
  }),
  component: EventPage,
});

function EventPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [atletica, setAtletica] = useState("");
  const [whats, setWhats] = useState("");
  const { data: profile, refetch: refetchProfile } = useQuery({
    enabled: !!user,
    queryKey: ["my-profile", user?.id],
    queryFn: async () => (await supabase.from("profiles").select("whatsapp, email").eq("id", user!.id).maybeSingle()).data,
  });

  const { data: atleticas } = useQuery({
    queryKey: ["atleticas"],
    queryFn: async () => (await supabase.from("settings").select("atleticas").eq("id", 1).maybeSingle()).data?.atleticas ?? [],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data: ev, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      const { data: tts } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", id)
        .order("price");
      return { ev, tts: tts ?? [] };
    },
  });

  if (isLoading) return <p className="p-6 text-muted-foreground">Carregando…</p>;
  if (!data?.ev) return <p className="p-6">Evento não encontrado.</p>;
  const { ev, tts } = data;
  const tt = tts.find((t) => t.id === selected);
  const remaining = (t: (typeof tts)[number]) => Math.max(t.total_quantity - t.sold, 0);

  const checkout = async () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/evento/${id}` } });
      return;
    }
    if (!tt) return;
    if (profile && !profile.whatsapp) {
      if (whats.replace(/\D/g, "").length < 10) { toast.error("Informe seu WhatsApp"); return; }
      await supabase.from("profiles").update({ whatsapp: whats.trim(), email: profile.email || user.email || null }).eq("id", user.id);
      refetchProfile();
    }
    setBusy(true);
    const { data: orderId, error } = await supabase.rpc("create_order", {
      _ticket_type_id: tt.id,
      _quantity: qty,
    });
    if (!error && atletica) {
      await supabase.rpc("set_order_atletica", { _order_id: orderId as string, _atletica: atletica });
    }
    const ref = localStorage.getItem("a42_ref");
    if (!error && ref) {
      await supabase.rpc("set_order_promoter", { _order_id: orderId as string, _code: ref });
    }
    setBusy(false);
    if (error) {
      toast.error(errMsg(error));
      return;
    }
    // o pagamento (Pix, crédito ou débito) acontece na tela do pedido
    navigate({ to: "/pedido/$id", params: { id: orderId as string } });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:grid md:grid-cols-2 md:gap-10">
      <div className="aspect-[4/5] overflow-hidden rounded-lg bg-sunset">
        {ev.poster_url ? (
          <img src={ev.poster_url} alt={ev.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-end p-6">
            <span className="font-display text-7xl leading-none text-accent-foreground">{ev.name}</span>
          </div>
        )}
      </div>
      <div className="mt-6 md:mt-0">
        <h1 className="text-5xl">{ev.name}</h1>
        <p className="mt-2 font-semibold text-primary">
          {dateBR(ev.event_date)} · {ev.event_time} · {ev.location}
        </p>
        <p className="mt-4 whitespace-pre-line text-muted-foreground">{ev.description}</p>

        <h2 className="mt-8 text-2xl">Ingressos</h2>
        <div className="mt-3 space-y-2">
          {tts.filter((t) => t.active).map((t) => {
            const left = remaining(t);
            const off = left === 0;
            return (
              <button
                key={t.id}
                disabled={off}
                onClick={() => {
                  setSelected(t.id);
                  setQty(1);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border p-4 text-left transition",
                  selected === t.id ? "border-primary bg-primary/10" : "border-border bg-card",
                  off && "opacity-40",
                )}
              >
                <div>
                  <div className="font-display text-xl">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{off ? "Esgotado" : `${left} restantes`}</div>
                </div>
                <div className="text-lg font-bold">{brl(t.price)}</div>
              </button>
            );
          })}
        </div>

        {tt && (
          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Quantidade</span>
              <div className="flex items-center gap-3">
                <Button size="icon" variant="secondary" onClick={() => setQty(Math.max(1, qty - 1))}>−</Button>
                <span className="w-6 text-center font-bold">{qty}</span>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setQty(Math.min(10, remaining(tt), qty + 1))}
                >
                  +
                </Button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-sm">Atlética <span className="text-muted-foreground">(opcional)</span></span>
              {(atleticas?.length ?? 0) > 0 ? (
                <select
                  className="h-9 max-w-[60%] rounded-md border border-input bg-background px-3 text-sm"
                  value={atletica}
                  onChange={(e) => setAtletica(e.target.value)}
                >
                  <option value="">Nenhuma</option>
                  {atleticas!.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              ) : (
                <Input className="h-9 max-w-[60%]" maxLength={80} placeholder="Qual sua atlética?" value={atletica} onChange={(e) => setAtletica(e.target.value)} />
              )}
            </div>
            {user && profile && !profile.whatsapp && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm">WhatsApp</span>
                <Input className="h-9 max-w-[60%]" inputMode="tel" placeholder="(11) 99999-9999" value={whats} onChange={(e) => setWhats(e.target.value)} />
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">{qty}× {tt.name}</span>
              <span className="text-2xl font-bold">{brl(Number(tt.price) * qty)}</span>
            </div>
            <Button variant="sunset" className="mt-4 h-12 w-full" disabled={busy} onClick={checkout}>
              {user ? "Ir para o pagamento" : "Entrar para comprar"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
