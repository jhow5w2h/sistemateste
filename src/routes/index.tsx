import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { dateBR } from "@/lib/format";
import hero from "@/assets/hero-sunset.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ÁREA 42 — Ingressos oficiais BECO42" },
      { name: "description", content: "Garanta seu ingresso para os próximos eventos da BECO42." },
      { property: "og:title", content: "ÁREA 42 — Ingressos oficiais BECO42" },
      { property: "og:description", content: "Garanta seu ingresso para os próximos eventos da BECO42." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "ativo")
        .order("event_date");
      if (error) throw error;
      return data;
    },
  });

  return (
    <main>
      <section className="relative overflow-hidden">
        <img src={hero} alt="" width={1280} height={1600} className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background" />
        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-24">
          <p className="mb-2 text-xs font-bold tracking-[0.4em] text-primary">BECO42 APRESENTA</p>
          <h1 className="mt-6 text-[22vw] leading-[0.9] sm:text-9xl">
            Área <span className="text-sunset">42</span>
          </h1>
          <p className="mt-4 max-w-sm text-muted-foreground">Ingressos oficiais. Pagou, confirmou, tá na lista.</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="mb-6 text-3xl">Próximos rolês</h2>
        {isLoading && <p className="text-muted-foreground">Carregando…</p>}
        {events?.length === 0 && <p className="text-muted-foreground">Nenhum evento no momento.</p>}
        <div className="grid gap-6 sm:grid-cols-2">
          {events?.map((e) => (
            <article key={e.id} className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="aspect-[4/5] bg-sunset">
                {e.poster_url ? (
                  <img src={e.poster_url} alt={e.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-end p-6">
                    <span className="font-display text-6xl leading-none text-accent-foreground">{e.name}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-5">
                <h3 className="text-3xl">{e.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {dateBR(e.event_date)} · {e.event_time} · {e.location}
                </p>
                <Button asChild variant="sunset" className="h-12 w-full">
                  <Link to="/evento/$id" params={{ id: e.id }}>Garantir ingresso</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
