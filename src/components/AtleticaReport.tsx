import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const statusLabel: Record<string, string> = { pago: "Pago", aguardando_pagamento: "Aguardando" };

export function AtleticaReport({ admin, clients = true, options = [] }: { admin?: boolean; clients?: boolean; options?: string[] }) {
  const [filter, setFilter] = useState("");
  const { data: rows } = useQuery({
    queryKey: ["atletica-report", admin ? filter : "mine"],
    queryFn: async () => (await supabase.rpc("atletica_report", admin && filter ? { _atletica: filter } : {})).data ?? [],
  });
  const list = rows ?? [];
  const paid = list.filter((r) => r.status === "pago").reduce((s, r) => s + r.quantity, 0);

  const exportCsv = () => {
    const lines = [["Atlética", "Nome", "E-mail", "WhatsApp", "Evento", "Ingresso", "Qtd", "Status", "Promoter", "Data", "Entraram"]];
    list.forEach((r) => lines.push([r.atletica, r.full_name ?? "", r.email ?? "", r.whatsapp ?? "", r.event_name, r.ticket_type, String(r.quantity), statusLabel[r.status] ?? r.status, r.promoter ?? "", new Date(r.created_at).toLocaleString("pt-BR"), String(r.checked_in)]));
    const csv = lines.map((l) => l.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = `relatorio-atletica${filter ? "-" + filter : ""}.csv`;
    a.click();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-display text-2xl">Relatório por atlética</div>
        <div className="flex gap-2">
          {admin && (
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Todas as atléticas</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {clients && <Button size="sm" variant="outline" onClick={exportCsv} disabled={!list.length}>Exportar CSV</Button>}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{list.length} {list.length === 1 ? "pedido" : "pedidos"} · {paid} ingressos pagos</p>
      <div className="mt-3 max-h-96 overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              {clients && <><th className="p-2">Nome</th><th className="p-2">WhatsApp</th></>}
              <th className="p-2">Atlética</th><th className="p-2">Evento</th><th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {clients && (
                  <td className="p-2 font-semibold">
                    {r.full_name ?? "—"}
                    <div className="text-xs font-normal text-muted-foreground">{r.email ?? ""}</div>
                  </td>
                )}
                {clients && <td className="p-2">{r.whatsapp ?? "—"}</td>}
                <td className="p-2">{r.atletica}</td>
                <td className="p-2">{r.event_name} · {r.quantity}× {r.ticket_type}</td>
                <td className="p-2">{statusLabel[r.status] ?? r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-2 text-sm text-muted-foreground">Nenhum pedido com atlética ainda.</p>}
      </div>
    </div>
  );
}
