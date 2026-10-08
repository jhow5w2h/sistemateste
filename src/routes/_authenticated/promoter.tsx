import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PromoterCard } from "@/components/PromoterCard";
import { useAuth } from "@/lib/auth";
import { AtleticaReport } from "@/components/AtleticaReport";

export const Route = createFileRoute("/_authenticated/promoter")({
  head: () => ({
    meta: [
      { title: "Painel do Promoter — ÁREA 42" },
      { name: "description", content: "Acompanhe suas vendas e sua meta." },
      { property: "og:title", content: "Painel do Promoter — ÁREA 42" },
      { property: "og:description", content: "Acompanhe suas vendas e sua meta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromoterPage,
});

function PromoterPage() {
  const { user, isPromoter, loading } = useAuth();
  const { data } = useQuery({
    enabled: !!user && isPromoter,
    queryKey: ["promoter-stats", user?.id],
    queryFn: async () => (await supabase.rpc("promoter_stats", { _user_id: user!.id })).data?.[0] ?? null,
  });
  const { data: me } = useQuery({
    enabled: !!user && isPromoter,
    queryKey: ["promoter-me", user?.id],
    queryFn: async () => (await supabase.from("promoters").select("atletica").eq("user_id", user!.id).maybeSingle()).data,
  });
  if (loading) return <p className="p-6 text-muted-foreground">Carregando…</p>;
  if (!isPromoter) return <p className="p-6">Acesso só para promoters.</p>;
  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-8">
      <h1 className="text-5xl">Minhas vendas</h1>
      {data && (
        <>
          <PromoterCard s={data}>
            <div className="mt-3 text-sm">Atlética: <span className="font-bold text-primary">{me?.atletica || "não definida (peça ao admin)"}</span></div>
          </PromoterCard>
          <AtleticaReport clients={false} />
        </>
      )}
    </main>
  );
}
