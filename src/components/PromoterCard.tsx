import { brl } from "@/lib/format";

type Stat = { full_name: string | null; code: string; goal: number; sold: number; pending: number; revenue: number };

export function PromoterCard({ s, children }: { s: Stat; children?: React.ReactNode }) {
  const pct = s.goal > 0 ? Math.min(100, Math.round((Number(s.sold) / s.goal) * 100)) : 0;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-2xl">{s.full_name || "Promoter"}</div>
          <div className="text-xs text-muted-foreground">Código {s.code}</div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{Number(s.sold)}</div>
          <div className="text-xs text-muted-foreground">ingressos pagos</div>
        </div>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-sunset transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{s.goal > 0 ? `Meta: ${s.goal} (${pct}%)` : "Sem meta definida"}</span>
        <span>{Number(s.pending)} aguardando · {brl(Number(s.revenue))}</span>
      </div>
      {children}
    </div>
  );
}
