import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, Car, Wrench, Receipt, TrendingUp, Package, UserCircle, LogOut, Cog, Wallet } from "lucide-react";
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
];

export function AppShell() {
  const location = useLocation();
  const nav2 = useNavigate();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) nav2({ to: "/auth" });
      else setEmail(data.user.email || "");
    });
  }, [nav2]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
            <Cog className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">Auto Mecânica Bledon</div>
            <div className="text-xs text-sidebar-foreground/60">Gestão & CRM</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/80"
                }`}
              >
                <Icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60 mb-2 truncate px-2">{email}</div>
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
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
