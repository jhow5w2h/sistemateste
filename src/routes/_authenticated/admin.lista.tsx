import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useStaffEvents, useGuestList } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/admin/lista")({ component: GuestList });

function GuestList() {
  const { isAdmin } = useAuth();
  const [eventId, setEventId] = useState("");
  const [q, setQ] = useState("");
  const { data: events } = useStaffEvents();
  const ev = eventId || events?.[0]?.id || "";
  const { data: rows } = useGuestList(ev);
  const filtered = (rows ?? []).filter((r) => (r.full_name ?? "").toLowerCase().includes(q.toLowerCase()));

  const download = (lines: string[][], name: string) => {
    const csv = lines.map((l) => l.map((c) => `"${(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = name;
    a.click();
  };
  const exportCsv = () => {
    const lines = [["Nome", "E-mail", "WhatsApp", "Ingresso", "Atlética", "Código", "Status", "Check-in"]];
    filtered.forEach((r) => lines.push([r.full_name ?? "", r.email ?? "", r.whatsapp ?? "", r.ticket_type, r.atletica ?? "", r.code, "Pago", r.checked_in_at ? new Date(r.checked_in_at).toLocaleString("pt-BR") : ""]));
    download(lines, "lista.csv");
  };
  const exportLeads = async () => {
    const { data } = await supabase.from("profiles").select("full_name, email, whatsapp, created_at").order("created_at", { ascending: false });
    const lines = [["Nome", "E-mail", "WhatsApp", "Cadastro"]];
    (data ?? []).forEach((p) => lines.push([p.full_name, p.email ?? "", p.whatsapp, new Date(p.created_at).toLocaleString("pt-BR")]));
    download(lines, "leads.csv");
  };

  return (
    <div>
      <h2 className="mb-4 text-3xl">Lista do evento</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={ev} onChange={(e) => setEventId(e.target.value)}>
          {events?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <Input className="max-w-xs" placeholder="Buscar nome" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" onClick={exportCsv}>Exportar CSV</Button>
        {isAdmin && <Button variant="outline" onClick={exportLeads}>Exportar todos os leads</Button>}
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{filtered.length} nomes na lista · {filtered.filter((r) => r.checked_in_at).length} já entraram</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-2">Nome</th><th className="p-2">E-mail</th><th className="p-2">WhatsApp</th><th className="p-2">Ingresso</th><th className="p-2">Atlética</th><th className="p-2">Check-in</th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.code} className="border-t border-border">
                <td className="p-2 font-semibold">{r.full_name}</td>
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.whatsapp}</td>
                <td className="p-2">{r.ticket_type}</td>
                <td className="p-2">{r.atletica || "—"}</td>
                <td className="p-2">{r.checked_in_at ? "✓ " + new Date(r.checked_in_at).toLocaleTimeString("pt-BR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
