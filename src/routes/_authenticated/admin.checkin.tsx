import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errMsg } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStaffEvents } from "@/lib/staff";

export const Route = createFileRoute("/_authenticated/admin/checkin")({ component: CheckIn });

type Result = { ok: boolean; message: string; name?: string };

function CheckIn() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<{ code: string; name: string; used: boolean }[]>([]);
  const [eventId, setEventId] = useState("");
  const { data: events } = useStaffEvents();
  const ev = eventId || events?.[0]?.id || "";
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const busy = useRef(false);

  const check = async (c: string) => {
    if (!c.trim() || busy.current) return;
    busy.current = true;
    const { data, error } = await supabase.rpc("check_in_ticket", { _code: c });
    setResult(error ? { ok: false, message: errMsg(error) } : (data as Result));
    setCode("");
    setTimeout(() => (busy.current = false), 2000);
  };

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;
      const s = new Html5Qrcode("qr-reader");
      scannerRef.current = s;
      await s.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (text) => check(text), () => {});
    })().catch((e) => setResult({ ok: false, message: "Câmera indisponível: " + errMsg(e) }));
    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [scanning]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async () => {
    if (!ev) return;
    const { data } = await supabase.rpc("guest_list", { _event_id: ev });
    const term = q.trim().toLowerCase();
    setMatches(
      (data ?? [])
        .filter((t) => (t.full_name ?? "").toLowerCase().includes(term) || t.code.toLowerCase().includes(term))
        .slice(0, 30)
        .map((t) => ({ code: t.code, name: t.full_name ?? "", used: !!t.checked_in_at })),
    );
  };

  return (
    <div className="mx-auto max-w-md space-y-5">
      <h2 className="text-3xl">Portaria</h2>
      {result && (
        <div className={cn("rounded-lg p-6 text-center", result.ok ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
          <div className="font-display text-3xl">{result.ok ? "Liberado" : "Bloqueado"}</div>
          {result.name && <div className="mt-1 text-lg font-bold">{result.name}</div>}
          <div className="text-sm">{result.message}</div>
        </div>
      )}
      <Button variant="sunset" className="h-12 w-full" onClick={() => setScanning(!scanning)}>
        {scanning ? "Parar câmera" : "Ler QR Code"}
      </Button>
      {scanning && <div id="qr-reader" className="overflow-hidden rounded-lg" />}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); check(code); }}>
        <Input placeholder="Código do ingresso" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button type="submit">Validar</Button>
      </form>
      <div className="border-t border-border pt-5">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={ev} onChange={(e) => setEventId(e.target.value)}>
            {events?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <Input placeholder="Nome ou código" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <div className="mt-3 space-y-2">
          {matches.map((m) => (
            <div key={m.code} className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.code}</div>
              </div>
              {m.used ? (
                <span className="text-xs text-muted-foreground">Já entrou</span>
              ) : (
                <Button size="sm" variant="success" onClick={async () => { await check(m.code); search(); }}>Dar entrada</Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
