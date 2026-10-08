import { cn } from "@/lib/utils";

const map = {
  aguardando_pagamento: { label: "Aguardando pagamento", cls: "bg-warning text-warning-foreground" },
  pago: { label: "Pago", cls: "bg-success text-success-foreground" },
  cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
} as const;

export function StatusBadge({ status }: { status: keyof typeof map }) {
  const s = map[status];
  return (
    <span className={cn("inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider", s.cls)}>
      {s.label}
    </span>
  );
}
