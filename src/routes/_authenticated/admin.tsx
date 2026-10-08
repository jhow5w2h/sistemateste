import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel — ÁREA 42" },
      { name: "description", content: "Painel da equipe BECO42." },
      { property: "og:title", content: "Painel — ÁREA 42" },
      { property: "og:description", content: "Painel da equipe BECO42." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Dashboard", exact: true, mod: false },
  { to: "/admin/eventos", label: "Eventos", mod: false },
  { to: "/admin/pedidos", label: "Pedidos", mod: false },
  { to: "/admin/lista", label: "Lista", mod: true },
  { to: "/admin/checkin", label: "Check-in", mod: true },
  { to: "/admin/promoters", label: "Promoters", mod: false },
  { to: "/admin/equipe", label: "Equipe", mod: false },
  { to: "/admin/config", label: "Config", mod: false },
] as const;

const modPaths = ["/admin/lista", "/admin/checkin"];

function AdminLayout() {
  const { isAdmin, isStaff, loading } = useAuth();
  const path = useLocation({ select: (l) => l.pathname });
  if (loading) return <p className="p-6 text-muted-foreground">Carregando…</p>;
  if (!isStaff) return <p className="p-6">Acesso restrito à equipe BECO42.</p>;
  const blocked = !isAdmin && !modPaths.some((p) => path.startsWith(p));
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="-mx-4 mb-6 flex gap-1 overflow-x-auto px-4">
        {tabs.filter((t) => isAdmin || t.mod).map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: "exact" in t }}
            className="whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground"
            activeProps={{ className: "bg-sunset text-accent-foreground" }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {blocked ? <p className="text-muted-foreground">Moderador: use as abas Lista e Check-in.</p> : <Outlet />}
    </div>
  );
}
