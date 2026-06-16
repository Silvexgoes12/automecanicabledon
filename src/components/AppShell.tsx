import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, Car, Wrench, Receipt, TrendingUp, Package, UserCircle, LogOut, Cog, Wallet, Menu, ChevronLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallPWAButton } from "@/components/InstallPWAButton";

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/fluxo-caixa", label: "Fluxo de Caixa", icon: Wallet },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/veiculos", label: "Veículos", icon: Car },
  { to: "/app/ordens", label: "Ordens de Serviço", icon: Wrench },
  { to: "/app/despesas", label: "Despesas", icon: Receipt },
  { to: "/app/pecas", label: "Peças & Estoque", icon: Package },
  { to: "/app/crm", label: "CRM", icon: TrendingUp },
  { to: "/app/equipe", label: "Equipe", icon: UserCircle },
  { to: "/app/suporte", label: "Suporte", icon: MessageSquare },
];

export function AppShell() {
  const location = useLocation();
  const nav2 = useNavigate();
  const [email, setEmail] = useState<string>("");
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) return saved === "1";
    return window.innerWidth < 768;
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) nav2({ to: "/auth" });
      else setEmail(data.user.email || "");
    });
  }, [nav2]);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`${collapsed ? "w-14" : "w-64"} transition-all duration-200 bg-sidebar text-sidebar-foreground flex flex-col shrink-0`}
      >
        <div className={`p-3 border-b border-sidebar-border flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="h-9 w-9 rounded-md bg-primary flex items-center justify-center shrink-0 hover:opacity-90"
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <Menu className="h-5 w-5 text-primary-foreground" /> : <Cog className="h-5 w-5 text-primary-foreground" />}
          </button>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm leading-tight truncate">Auto Mecânica Bledon</div>
                <div className="text-xs text-sidebar-foreground/60">Gestão & CRM</div>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-sidebar-accent"
                aria-label="Recolher menu"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((n) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                title={collapsed ? n.label : undefined}
                className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/80"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{n.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={`p-2 border-t border-sidebar-border space-y-2 ${collapsed ? "hidden" : ""}`}>
          <InstallPWAButton />
          <div className="text-xs text-sidebar-foreground/60 truncate px-2">{email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={async () => {
              await supabase.auth.signOut();
              nav2({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
        {collapsed && (
          <div className="p-2 border-t border-sidebar-border">
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                nav2({ to: "/auth" });
              }}
              className="w-full h-9 flex items-center justify-center rounded-md hover:bg-sidebar-accent"
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
