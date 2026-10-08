import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Entrar — ÁREA 42" },
      { name: "description", content: "Crie sua conta ou entre para comprar ingressos." },
      { property: "og:title", content: "Entrar — ÁREA 42" },
      { property: "og:description", content: "Crie sua conta ou entre para comprar ingressos." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const target = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/meus-ingressos";
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", email: "", whatsapp: "", password: "" });

  useEffect(() => {
    if (redirect) sessionStorage.setItem("a42_redirect", target);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: sessionStorage.getItem("a42_redirect") ?? target, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === "SIGNED_IN" && s) {
        const t = sessionStorage.getItem("a42_redirect") ?? target;
        sessionStorage.removeItem("a42_redirect");
        navigate({ to: t, replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (f.name.trim().length < 3) throw new Error("Informe seu nome completo");
        if (f.whatsapp.replace(/\D/g, "").length < 10) throw new Error("WhatsApp inválido");
        const { data, error } = await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: {
            emailRedirectTo: window.location.origin + target,
            data: { full_name: f.name.trim(), whatsapp: f.whatsapp.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw new Error("E-mail ou senha incorretos");
      }
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    sessionStorage.setItem("a42_redirect", target);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar com Google");
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-5xl">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === "signup" && (
          <>
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input required inputMode="tel" placeholder="(11) 99999-9999" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
            </div>
          </>
        )}
        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Senha</Label>
          <Input required type="password" minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </div>
        <Button type="submit" variant="sunset" className="h-12 w-full" disabled={busy}>
          {mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
      </form>
      <Button variant="outline" className="mt-3 h-12 w-full" onClick={google}>Continuar com Google</Button>
      <button className="mt-6 w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
        {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
      </button>
    </main>
  );
}
