import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { fmtBRL, fmtNum } from "@/lib/format";
import { Wrench, Users, Car, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard | Diesel Mecânica" }] }),
});

const COLORS = ["hsl(var(--chart-1))","hsl(var(--chart-2))","hsl(var(--chart-3))","hsl(var(--chart-4))","hsl(var(--chart-5))"];
const C = ["#c2410c","#0369a1","#15803d","#b45309","#7c3aed"];

function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState<"all" | "2024" | "2025">("all");

  useEffect(() => { (async () => {
    const [cli, vei, os, desp] = await Promise.all([
      supabase.from("clientes").select("id", { count: "exact", head: true }),
      supabase.from("veiculos").select("id", { count: "exact", head: true }),
      supabase.from("ordens_servico").select("data_abertura,valor_total,custo_pecas,status"),
      supabase.from("despesas").select("data,categoria,valor"),
    ]);
    setData({ cli: cli.count, vei: vei.count, os: os.data || [], desp: desp.data || [] });
  })(); }, []);

  if (!data) return <div className="p-8">Carregando...</div>;

  const monthly: Record<string, { mes: string; receita: number; despesa: number; os: number }> = {};
  data.os.forEach((o: any) => {
    const m = (o.data_abertura || "").slice(0, 7);
    if (!m) return;
    monthly[m] = monthly[m] || { mes: m, receita: 0, despesa: 0, os: 0 };
    if (o.status !== "cancelada") {
      monthly[m].receita += Number(o.valor_total || 0);
      monthly[m].os += 1;
    }
  });
  data.desp.forEach((d: any) => {
    const m = (d.data || "").slice(0, 7);
    if (!m) return;
    monthly[m] = monthly[m] || { mes: m, receita: 0, despesa: 0, os: 0 };
    monthly[m].despesa += Number(d.valor || 0);
  });
  const series = Object.values(monthly).sort((a, b) => a.mes.localeCompare(b.mes));

  const totalReceita = series.reduce((s, x) => s + x.receita, 0);
  const totalDespesa = series.reduce((s, x) => s + x.despesa, 0);
  const lucro = totalReceita - totalDespesa;

  const catLabels: Record<string, string> = {
    folha_pagamento: "Folha de Pagamento",
    impostos: "Impostos",
    compra_pecas: "Compra de Peças",
    encargos_sociais: "Encargos Sociais",
    aluguel: "Aluguel",
    energia: "Energia Elétrica",
    compra_lubrificantes: "Lubrificantes",
    contabilidade: "Contabilidade",
    agua: "Água",
    internet: "Internet",
    telefone: "Telefone",
    manutencao: "Manutenção",
    marketing: "Marketing",
    seguros: "Seguros",
    combustivel: "Combustível",
    material_escritorio: "Material de Escritório",
    epi: "EPI",
    treinamento: "Treinamento",
    transporte: "Transporte",
    outros: "Outros",
  };
  const prettyCat = (k: string) => catLabels[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const byCat: Record<string, number> = {};
  data.desp.forEach((d: any) => { byCat[d.categoria] = (byCat[d.categoria] || 0) + Number(d.valor); });
  const catData = Object.entries(byCat).map(([name, value]) => ({ name: prettyCat(name), value })).sort((a, b) => b.value - a.value).slice(0, 8);
  const totalCat = catData.reduce((s, x) => s + x.value, 0);

  const stat = (label: string, value: string, sub: string, Icon: any, tone: string) => (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{sub}</div>
        </div>
        <div className={`h-10 w-10 rounded-md flex items-center justify-center ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral 2024-2025</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stat("Receita Total", fmtBRL(totalReceita), "Período completo", DollarSign, "bg-success/15 text-success")}
        {stat("Despesa Total", fmtBRL(totalDespesa), "Período completo", TrendingDown, "bg-destructive/15 text-destructive")}
        {stat("Lucro Bruto", fmtBRL(lucro), `${((lucro / Math.max(totalReceita, 1)) * 100).toFixed(1)}% margem`, TrendingUp, "bg-primary/15 text-primary")}
        {stat("Ordens de Serviço", fmtNum(data.os.length), "Total no período", Wrench, "bg-chart-2/15 text-chart-2")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stat("Clientes", fmtNum(data.cli), "Cadastrados", Users, "bg-accent text-accent-foreground")}
        {stat("Veículos", fmtNum(data.vei), "Na base", Car, "bg-chart-3/15 text-chart-3")}
        {stat("Ticket Médio", fmtBRL(totalReceita / Math.max(data.os.length, 1)), "Por OS", DollarSign, "bg-chart-4/15 text-chart-4")}
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4">Receita vs Despesa (mensal)</h2>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
              <Legend />
              <Line type="monotone" dataKey="receita" name="Receita" stroke={C[2]} strokeWidth={2} />
              <Line type="monotone" dataKey="despesa" name="Despesa" stroke={C[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold mb-4">OS por mês</h2>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="os" fill={C[1]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold mb-1">Top categorias de despesa</h2>
          <p className="text-xs text-muted-foreground mb-4">Distribuição dos gastos no período</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={catData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {catData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => fmtBRL(Number(v))}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 text-sm">
              {catData.map((c, i) => {
                const pct = ((c.value / Math.max(totalCat, 1)) * 100).toFixed(1);
                return (
                  <li key={c.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: C[i % C.length] }} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-muted-foreground tabular-nums text-xs">{pct}%</span>
                    <span className="font-medium tabular-nums text-xs w-20 text-right">{fmtBRL(c.value)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
