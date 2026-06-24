import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { fmtBRL, fmtNum } from "@/lib/format";
import {
  Wrench, Users, Car, TrendingUp, TrendingDown, DollarSign,
  Activity, Receipt, Sparkles, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area,
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard | Diesel Mecânica" }] }),
});

// Branded palette (warm orange / teal / green / amber / violet)
const C = ["#ea580c", "#0891b2", "#16a34a", "#d97706", "#7c3aed"];

function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState<"all" | "2024" | "2025" | "2026">("all");

  useEffect(() => { (async () => {
    const [cli, vei, os, desp] = await Promise.all([
      supabase.from("clientes").select("id", { count: "exact", head: true }),
      supabase.from("veiculos").select("id", { count: "exact", head: true }),
      supabase.from("ordens_servico").select("data_abertura,valor_total,custo_pecas,status"),
      supabase.from("despesas").select("data,categoria,valor"),
    ]);
    setData({ cli: cli.count, vei: vei.count, os: os.data || [], desp: desp.data || [] });
  })(); }, []);

  const computed = useMemo(() => {
    if (!data) return null;
    const inYear = (d: string) => year === "all" || (d || "").startsWith(year);
    const osFiltered = data.os.filter((o: any) => inYear(o.data_abertura));
    const despFiltered = data.desp.filter((d: any) => inYear(d.data));

    const monthly: Record<string, { mes: string; receita: number; despesa: number; os: number }> = {};
    osFiltered.forEach((o: any) => {
      const m = (o.data_abertura || "").slice(0, 7);
      if (!m) return;
      monthly[m] = monthly[m] || { mes: m, receita: 0, despesa: 0, os: 0 };
      if (o.status !== "cancelada") {
        monthly[m].receita += Number(o.valor_total || 0);
        monthly[m].os += 1;
      }
    });
    despFiltered.forEach((d: any) => {
      const m = (d.data || "").slice(0, 7);
      if (!m) return;
      monthly[m] = monthly[m] || { mes: m, receita: 0, despesa: 0, os: 0 };
      monthly[m].despesa += Number(d.valor || 0);
    });
    const series = Object.values(monthly)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((s) => ({ ...s, lucro: s.receita - s.despesa }));

    const totalReceita = series.reduce((s, x) => s + x.receita, 0);
    const totalDespesa = series.reduce((s, x) => s + x.despesa, 0);
    const lucro = totalReceita - totalDespesa;

    // Trend (last vs prev month)
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const trend = (k: "receita" | "despesa" | "os") => {
      if (!last || !prev || !prev[k]) return null;
      return ((last[k] - prev[k]) / prev[k]) * 100;
    };

    const catLabels: Record<string, string> = {
      folha_pagamento: "Folha de Pagamento", impostos: "Impostos",
      compra_pecas: "Compra de Peças", encargos_sociais: "Encargos Sociais",
      aluguel: "Aluguel", energia: "Energia Elétrica",
      compra_lubrificantes: "Lubrificantes", contabilidade: "Contabilidade",
      agua: "Água", internet: "Internet", telefone: "Telefone",
      manutencao: "Manutenção", marketing: "Marketing", seguros: "Seguros",
      combustivel: "Combustível", material_escritorio: "Material de Escritório",
      epi: "EPI", treinamento: "Treinamento", transporte: "Transporte", outros: "Outros",
    };
    const prettyCat = (k: string) => catLabels[k] || k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const byCat: Record<string, number> = {};
    despFiltered.forEach((d: any) => { byCat[d.categoria] = (byCat[d.categoria] || 0) + Number(d.valor); });
    const catData = Object.entries(byCat)
      .map(([name, value]) => ({ name: prettyCat(name), value }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
    const totalCat = catData.reduce((s, x) => s + x.value, 0);

    return {
      osFiltered, series, totalReceita, totalDespesa, lucro,
      trendReceita: trend("receita"), trendDespesa: trend("despesa"), trendOs: trend("os"),
      catData, totalCat,
    };
  }, [data, year]);

  if (!data || !computed) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-10 w-64 rounded-md bg-muted/50 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />)}
        </div>
        <div className="h-80 rounded-xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  const { osFiltered, series, totalReceita, totalDespesa, lucro,
    trendReceita, trendDespesa, trendOs, catData, totalCat } = computed;

  const margem = (lucro / Math.max(totalReceita, 1)) * 100;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 md:p-8">
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 0%, hsl(var(--primary)/0.18), transparent 50%), radial-gradient(circle at 0% 100%, hsl(var(--chart-2)/0.12), transparent 45%)",
          }}
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Painel financeiro
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {year === "all" ? "Visão geral 2024 – 2026" : `Exercício ${year}`}
              {" · "}
              <span className={cn("font-medium", lucro >= 0 ? "text-success" : "text-destructive")}>
                {lucro >= 0 ? "Resultado positivo" : "Resultado negativo"} de {fmtBRL(Math.abs(lucro))}
              </span>
            </p>
          </div>
          <div className="inline-flex rounded-xl border bg-background/70 backdrop-blur p-1 shadow-sm">
            {(["all","2024","2025","2026"] as const).map((y) => (
              <Button
                key={y}
                size="sm"
                variant={year === y ? "default" : "ghost"}
                className={cn("h-9 px-4 rounded-lg", year === y && "shadow-sm")}
                onClick={() => setYear(y)}
              >
                {y === "all" ? "Todos" : y}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Receita Total" value={fmtBRL(totalReceita)} icon={DollarSign}
          accent="success" trend={trendReceita}
          series={series.map(s => s.receita)} sub={year === "all" ? "Período completo" : `Em ${year}`}
        />
        <KpiCard
          label="Despesa Total" value={fmtBRL(totalDespesa)} icon={TrendingDown}
          accent="destructive" trend={trendDespesa} trendInverse
          series={series.map(s => s.despesa)} sub={year === "all" ? "Período completo" : `Em ${year}`}
        />
        <KpiCard
          label="Lucro Bruto" value={fmtBRL(lucro)} icon={TrendingUp}
          accent="primary"
          series={series.map(s => s.lucro)} sub={`${margem.toFixed(1)}% de margem`}
        />
        <KpiCard
          label="Ordens de Serviço" value={fmtNum(osFiltered.length)} icon={Wrench}
          accent="chart2" trend={trendOs}
          series={series.map(s => s.os)} sub={year === "all" ? "Total no período" : `Em ${year}`}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniStat icon={Users} label="Clientes" value={fmtNum(data.cli)} sub="cadastrados" tone="bg-chart-3/15 text-chart-3" />
        <MiniStat icon={Car} label="Veículos" value={fmtNum(data.vei)} sub="na base" tone="bg-chart-2/15 text-chart-2" />
        <MiniStat icon={Receipt} label="Ticket Médio" value={fmtBRL(totalReceita / Math.max(osFiltered.length, 1))} sub="por ordem de serviço" tone="bg-chart-4/15 text-chart-4" />
      </div>

      {/* Main chart */}
      <Card className="p-5 md:p-6 overflow-hidden">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Activity className="h-4 w-4" />
              </div>
              <h2 className="font-semibold text-lg">Receita vs Despesa</h2>
            </div>
            <p className="text-xs text-muted-foreground ml-10">Evolução mensal no período selecionado</p>
          </div>
          <div className="flex gap-3 text-xs">
            <LegendDot color={C[2]} label="Receita" />
            <LegendDot color={C[0]} label="Despesa" />
          </div>
        </div>
        <div style={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C[2]} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={C[2]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C[0]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="mes" fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: any, n: any) => [fmtBRL(Number(v)), n === "receita" ? "Receita" : "Despesa"]}
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.15)" }}
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeDasharray: 3, strokeOpacity: 0.4 }}
              />
              <Area type="monotone" dataKey="receita" stroke={C[2]} strokeWidth={2.5} fill="url(#gRec)" />
              <Area type="monotone" dataKey="despesa" stroke={C[0]} strokeWidth={2.5} fill="url(#gDes)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2 p-5 md:p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-chart-2/15 text-chart-2 flex items-center justify-center">
              <Wrench className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-lg">OS por mês</h2>
          </div>
          <p className="text-xs text-muted-foreground ml-10 mb-4">Volume de ordens abertas</p>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={series} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C[1]} stopOpacity={1} />
                    <stop offset="100%" stopColor={C[1]} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                />
                <Bar dataKey="os" fill="url(#gBar)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-3 p-5 md:p-6">
          <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <h2 className="font-semibold text-lg">Top categorias de despesa</h2>
              </div>
              <p className="text-xs text-muted-foreground ml-10">Distribuição dos gastos no período</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-bold text-base">{fmtBRL(totalCat)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center mt-4">
            <div className="relative" style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={catData} dataKey="value" nameKey="name"
                    innerRadius={62} outerRadius={100} paddingAngle={3}
                    stroke="hsl(var(--background))" strokeWidth={3}
                  >
                    {catData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => fmtBRL(Number(v))}
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Categorias</div>
                <div className="text-2xl font-bold">{catData.length}</div>
              </div>
            </div>
            <ul className="space-y-2.5 text-sm">
              {catData.map((c, i) => {
                const pct = ((c.value / Math.max(totalCat, 1)) * 100);
                return (
                  <li key={c.name} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: C[i % C.length] }} />
                      <span className="flex-1 truncate text-xs font-medium">{c.name}</span>
                      <span className="font-semibold tabular-nums text-xs">{fmtBRL(c.value)}</span>
                    </div>
                    <div className="ml-4 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: C[i % C.length] }}
                      />
                    </div>
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

function KpiCard({
  label, value, sub, icon: Icon, accent, series, trend, trendInverse,
}: {
  label: string; value: string; sub: string; icon: any;
  accent: "success" | "destructive" | "primary" | "chart2";
  series: number[]; trend?: number | null; trendInverse?: boolean;
}) {
  const accentMap = {
    success: { bg: "bg-success/15", text: "text-success", stroke: "#16a34a", grad: "gKpiS" },
    destructive: { bg: "bg-destructive/15", text: "text-destructive", stroke: "#dc2626", grad: "gKpiD" },
    primary: { bg: "bg-primary/15", text: "text-primary", stroke: "#ea580c", grad: "gKpiP" },
    chart2: { bg: "bg-chart-2/15", text: "text-chart-2", stroke: "#0891b2", grad: "gKpiC" },
  }[accent];

  const sparkData = series.map((v, i) => ({ i, v }));
  const isUp = (trend ?? 0) >= 0;
  const trendGood = trendInverse ? !isUp : isUp;

  return (
    <Card className="p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
          <div className="text-2xl font-bold mt-1.5 tracking-tight">{value}</div>
          <div className="flex items-center gap-2 mt-1.5">
            {trend !== null && trend !== undefined && isFinite(trend) && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded",
                trendGood ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}>
                {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{sub}</span>
          </div>
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", accentMap.bg, accentMap.text)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {sparkData.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-12 opacity-70 pointer-events-none">
          <ResponsiveContainer>
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={accentMap.grad} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentMap.stroke} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accentMap.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={accentMap.stroke} strokeWidth={1.5} fill={`url(#${accentMap.grad})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: string }) {
  return (
    <Card className="p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
      <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold leading-tight">{value}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
