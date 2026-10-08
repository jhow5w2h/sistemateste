import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { PromoterCard } from "@/components/PromoterCard";
import { AtleticaReport } from "@/components/AtleticaReport";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/promoters")({ component: Promoters });

function Promoters() {
  const { data, refetch } = useQuery({
    queryKey: ["promoter-stats-all"],
    queryFn: async () => (await supabase.rpc("promoter_stats", {})).data ?? [],
  });
  const { data: tags, refetch: refetchTags } = useQuery({
    queryKey: ["promoter-tags"],
    queryFn: async () => (await supabase.from("promoters").select("user_id, atletica")).data ?? [],
  });
  const { data: atleticas } = useQuery({
    queryKey: ["atleticas"],
    queryFn: async () => (await supabase.from("settings").select("atleticas").eq("id", 1).maybeSingle()).data?.atleticas ?? [],
  });
  const tagOf = (uid: string) => tags?.find((t) => t.user_id === uid)?.atletica ?? "";
  const options = Array.from(new Set([...(atleticas ?? []), ...(tags ?? []).map((t) => t.atletica ?? "").filter(Boolean)]));

  const update = async (uid: string, patch: { goal?: number; atletica?: string | null }) => {
    const { error } = await supabase.from("promoters").update(patch).eq("user_id", uid);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Salvo");
    refetch();
    refetchTags();
  };
  return (
    <div className="space-y-4">
      <h2 className="text-3xl">Promoters</h2>
      <p className="text-sm text-muted-foreground">Cadastre promoters na aba Equipe. Defina a atlética de cada um: quem comprar pelo link dele recebe essa atlética automaticamente.</p>
      {!data?.length && <p className="text-muted-foreground">Nenhum promoter ainda.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((s) => (
          <PromoterCard key={s.user_id} s={s}>
            <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-2 text-sm">
              <span>Meta (ingressos)</span>
              <Input type="number" min={0} defaultValue={s.goal} className="h-8 w-24"
                onBlur={(e) => Number(e.target.value) !== s.goal && update(s.user_id, { goal: Math.max(0, Number(e.target.value) || 0) })} />
              <span>Atlética</span>
              <Input key={tagOf(s.user_id)} list="atl-opts" defaultValue={tagOf(s.user_id)} placeholder="Nome da atlética" className="h-8"
                onBlur={(e) => e.target.value.trim() !== tagOf(s.user_id) && update(s.user_id, { atletica: e.target.value.trim() || null })} />
            </div>
          </PromoterCard>
        ))}
      </div>
      <datalist id="atl-opts">{options.map((o) => <option key={o} value={o} />)}</datalist>
      <AtleticaReport admin options={options} />
    </div>
  );
}
