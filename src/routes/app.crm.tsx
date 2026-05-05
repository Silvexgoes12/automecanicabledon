import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { estagioLabel, estagioOrder, fmtBRL, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/app/crm")({
  component: Page,
  head: () => ({ meta: [{ title: "CRM | Diesel Mecânica" }] }),
});

const colors: Record<string, string> = {
  novo: "bg-muted",
  contato_feito: "bg-chart-2/15",
  qualificado: "bg-chart-4/15",
  proposta: "bg-accent",
  negociacao: "bg-warning/20",
  ganho: "bg-success/20",
  perdido: "bg-destructive/15",
};

function Page() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("crm_leads").select("*, funcionarios(nome)").order("data_criacao", { ascending: false }).then(({ data }) => {
      setLeads(data || []); setLoading(false);
    });
  }, []);
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    estagioOrder.forEach((e) => (g[e] = []));
    leads.forEach((l) => g[l.estagio]?.push(l));
    return g;
  }, [leads]);

  const total = leads.reduce((s, l) => s + Number(l.valor_estimado || 0), 0);
  const ganho = leads.filter((l) => l.estagio === "ganho").reduce((s, l) => s + Number(l.valor_estimado || 0), 0);

  return (
    <div className="p-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">CRM — Funil de vendas</h1>
        <p className="text-muted-foreground text-sm">
          {leads.length} leads • Pipeline: {fmtBRL(total)} • Ganho: {fmtBRL(ganho)}
        </p>
      </div>
      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {estagioOrder.map((e) => {
            const items = grouped[e] || [];
            const sum = items.reduce((s, l) => s + Number(l.valor_estimado || 0), 0);
            return (
              <div key={e} className={`rounded-md p-3 ${colors[e]}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-sm">{estagioLabel[e]}</div>
                  <Badge variant="outline">{items.length}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3">{fmtBRL(sum)}</div>
                <div className="space-y-2 max-h-[60vh] overflow-auto">
                  {items.map((l) => (
                    <Card key={l.id} className="p-3 text-sm">
                      <div className="font-medium leading-tight">{l.nome}</div>
                      <div className="text-xs text-muted-foreground truncate">{l.empresa}</div>
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="font-semibold text-primary">{fmtBRL(l.valor_estimado)}</span>
                        <span className="text-muted-foreground">{fmtDate(l.data_criacao)}</span>
                      </div>
                      {l.funcionarios?.nome && (
                        <div className="text-[10px] text-muted-foreground mt-1">👤 {l.funcionarios.nome}</div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
