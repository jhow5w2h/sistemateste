import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/equipe")({ component: Team });

const ROLE_LABEL: Record<string, string> = { admin: "Admin", moderator: "Moderador", promoter: "Promoter" };

function Team() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("moderator");
  const { data, refetch } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => (await supabase.rpc("list_staff")).data ?? [],
  });

  const grant = async () => {
    const { error } = await supabase.rpc("grant_role", { _email: email, _role: role });
    if (error) { toast.error(errMsg(error)); return; }
    toast.success(`${ROLE_LABEL[role]} cadastrado`);
    setEmail("");
    refetch();
  };
  const revoke = async (uid: string, r: string) => {
    if (!confirm(`Remover acesso de ${ROLE_LABEL[r]}?`)) return;
    const { error } = await supabase.rpc("revoke_role", { _user_id: uid, _role: r });
    if (error) { toast.error(errMsg(error)); return; }
    refetch();
  };

  return (
    <div className="max-w-2xl space-y-6">
      <section className="space-y-3">
        <h2 className="text-3xl">Equipe</h2>
        <p className="text-sm text-muted-foreground">
          Moderador: vê a lista e faz check-in (QR e código). Promoter: vê as próprias vendas e meta. A pessoa precisa criar a conta antes.
        </p>
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="moderator">Moderador</option>
            <option value="promoter">Promoter</option>
            <option value="admin">Admin</option>
          </select>
          <Button variant="sunset" onClick={grant}>Cadastrar</Button>
        </div>
      </section>
      <div className="divide-y divide-border rounded-lg border border-border">
        {data?.map((s) => (
          <div key={s.user_id + s.role} className="flex items-center justify-between p-3 text-sm">
            <div>
              <div className="font-semibold">{s.full_name || s.email}</div>
              <div className="text-xs text-muted-foreground">{s.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded bg-muted px-2 py-1 text-xs font-bold uppercase">{ROLE_LABEL[s.role] ?? s.role}</span>
              <Button size="sm" variant="ghost" onClick={() => revoke(s.user_id, s.role)}>Remover</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
