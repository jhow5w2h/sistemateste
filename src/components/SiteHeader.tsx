import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useBranding } from "@/components/Branding";

export function SiteHeader() {
  const { user, isStaff, isPromoter } = useAuth();
  const { data: brand } = useBranding();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="font-display text-2xl leading-none">
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt="Área 42" className="h-9 w-auto" />
          ) : (
            <>
              <span className="text-sunset">Área 42</span>
              <span className="ml-2 align-middle font-sans text-[10px] tracking-[0.3em] text-muted-foreground">BECO42</span>
            </>
          )}
        </Link>
        <nav className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider">
          {isStaff && <Link to="/admin" className="text-primary">Painel</Link>}
          {isPromoter && <Link to="/promoter" className="text-primary">Promoter</Link>}
          {user ? (
            <>
              <Link to="/meus-ingressos">Ingressos</Link>
              <button
                className="text-muted-foreground"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/", replace: true });
                }}
              >
                Sair
              </button>
            </>
          ) : (
            <Link to="/auth">Entrar</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
