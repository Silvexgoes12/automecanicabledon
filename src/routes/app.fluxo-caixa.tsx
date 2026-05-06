import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fmtBRL, fmtDate } from "@/lib/format";
import { Plus, Trash2, AlertTriangle, TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/app/fluxo-caixa")({
  component: FluxoCaixa,
  head: () => ({ meta: [{ title: "Fluxo de Caixa | Auto Mecânica Bledon" }] }),
});

type Lanc = {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  categoria: string;
  subcategoria: string | null;
  descricao: string;
  valor: number;
  forma_pagamento: string | null;
  status: "previsto" | "realizado";
  conta: "caixa" | "banco" | "cartao";
  data_vencimento: string | null;
  data_pagamento: string | null;
  cliente_fornecedor: string | null;
  observacoes: string | null;
};

const CAT_ENT = ["Serviços", "Venda de Peças", "Outras Receitas"];
const CAT_SAI = ["Folha de Pagamento", "Compra de Peças", "Aluguel", "Energia", "Água", "Internet", "Impostos", "Encargos Sociais", "Contabilidade", "Marketing", "Manutenção", "Combustível", "EPI", "Outros"];
const C = ["#15803d", "#c2410c", "#0369a1", "#b45309", "#7c3aed", "#be185d", "#0d9488", "#65a30d"];

function FluxoCaixa() {
  const [rows, setRows] = useState<Lanc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<"2024" | "2025" | "2026">("2025");
  const [month, setMonth] = useState(`${"2025"}-01`);
  const [saldoInicial, setSaldoInicial] = useState(0);

  useEffect(() => {
    setMonth((m) => `${year}-${m.slice(5) || "01"}`);
  }, [year]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("lancamentos").select("*").order("data", { ascending: false }).limit(2000);
    setRows((data as Lanc[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const inMonth = (d: string) => (d || "").startsWith(month);
  const realizadosMes = rows.filter((r) => r.status === "realizado" && inMonth(r.data));
  const previstosMes = rows.filter((r) => r.status === "previsto" && inMonth(r.data_vencimento || r.data));

  const entradasMes = realizadosMes.filter((r) => r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0);
  const saidasMes = realizadosMes.filter((r) => r.tipo === "saida").reduce((s, r) => s + Number(r.valor), 0);
  const resultado = entradasMes - saidasMes;
  const margem = entradasMes > 0 ? (resultado / entradasMes) * 100 : 0;

  // Mês anterior para comparação
  const prevMonth = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return d.toISOString().slice(0, 7);
  })();
  const realizadosPrev = rows.filter((r) => r.status === "realizado" && (r.data || "").startsWith(prevMonth));
  const entradasPrev = realizadosPrev.filter((r) => r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0);
  const saidasPrev = realizadosPrev.filter((r) => r.tipo === "saida").reduce((s, r) => s + Number(r.valor), 0);
  const resultadoPrev = entradasPrev - saidasPrev;
  const varReceita = entradasPrev > 0 ? ((entradasMes - entradasPrev) / entradasPrev) * 100 : 0;

  // Fluxo diário do mês
  const fluxoDiario = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    let saldo = saldoInicial;
    return Array.from({ length: days }, (_, i) => {
      const dStr = `${month}-${String(i + 1).padStart(2, "0")}`;
      const ent = realizadosMes.filter((r) => r.data === dStr && r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0);
      const sai = realizadosMes.filter((r) => r.data === dStr && r.tipo === "saida").reduce((s, r) => s + Number(r.valor), 0);
      const inicial = saldo;
      saldo = saldo + ent - sai;
      return { dia: String(i + 1).padStart(2, "0"), saldoInicial: inicial, entradas: ent, saidas: sai, saldoFinal: saldo };
    });
  }, [realizadosMes, month, saldoInicial]);

  // Fluxo projetado próximos 30 dias
  const projetado = useMemo(() => {
    const out: { data: string; entradas: number; saidas: number; saldo: number }[] = [];
    let saldo = entradasMes - saidasMes + saldoInicial;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().slice(0, 10);
      const ent = rows.filter((r) => r.status === "previsto" && r.tipo === "entrada" && (r.data_vencimento || r.data) === ds).reduce((s, r) => s + Number(r.valor), 0);
      const sai = rows.filter((r) => r.status === "previsto" && r.tipo === "saida" && (r.data_vencimento || r.data) === ds).reduce((s, r) => s + Number(r.valor), 0);
      saldo = saldo + ent - sai;
      out.push({ data: ds.slice(5), entradas: ent, saidas: sai, saldo });
    }
    return out;
  }, [rows, entradasMes, saidasMes, saldoInicial]);

  // Por categoria (saídas)
  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    realizadosMes.filter((r) => r.tipo === "saida").forEach((r) => { map[r.categoria] = (map[r.categoria] || 0) + Number(r.valor); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [realizadosMes]);

  // Contas a pagar/receber
  const contasPagar = rows.filter((r) => r.status === "previsto" && r.tipo === "saida").sort((a, b) => (a.data_vencimento || a.data).localeCompare(b.data_vencimento || b.data));
  const contasReceber = rows.filter((r) => r.status === "previsto" && r.tipo === "entrada").sort((a, b) => (a.data_vencimento || a.data).localeCompare(b.data_vencimento || b.data));

  // Indicadores
  const queimaCaixa = saidasMes;
  const reservaNec = saidasMes * 3;
  const pontoEquilibrio = saidasMes;
  const today = new Date().toISOString().slice(0, 10);
  const vencidas = rows.filter((r) => r.status === "previsto" && (r.data_vencimento || r.data) < today);

  const remove = async (id: string) => {
    if (!confirm("Excluir lançamento?")) return;
    await supabase.from("lancamentos").delete().eq("id", id);
    toast.success("Lançamento excluído");
    load();
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
          <p className="text-muted-foreground text-sm">Controle completo de entradas, saídas e projeções</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-md border bg-card p-1">
            {(["2024","2025","2026"] as const).map((y) => (
              <Button key={y} size="sm" variant={year === y ? "default" : "ghost"} className="h-8 px-3" onClick={() => setYear(y)}>{y}</Button>
            ))}
          </div>
          <Input type="month" value={month} min={`${year}-01`} max={`${year}-12`} onChange={(e) => e.target.value.startsWith(year) && setMonth(e.target.value)} className="w-44" />
          <Input type="number" value={saldoInicial} onChange={(e) => setSaldoInicial(Number(e.target.value))} placeholder="Saldo inicial" className="w-36" />
          <NovoLancamento onSaved={load} open={open} setOpen={setOpen} />
        </div>
      </div>

      {vencidas.length > 0 && (
        <Card className="p-4 border-destructive/50 bg-destructive/5 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div className="text-sm">
            <span className="font-semibold text-destructive">{vencidas.length} conta(s) vencida(s)</span>
            <span className="text-muted-foreground ml-2">— Total: {fmtBRL(vencidas.reduce((s, r) => s + Number(r.valor), 0))}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Entradas do Mês" value={fmtBRL(entradasMes)} sub={`${varReceita >= 0 ? "+" : ""}${varReceita.toFixed(1)}% vs mês ant.`} Icon={TrendingUp} tone="bg-success/15 text-success" />
        <KPI label="Saídas do Mês" value={fmtBRL(saidasMes)} sub={`Mês anterior: ${fmtBRL(saidasPrev)}`} Icon={TrendingDown} tone="bg-destructive/15 text-destructive" />
        <KPI label="Resultado" value={fmtBRL(resultado)} sub={`Margem ${margem.toFixed(1)}%`} Icon={Wallet} tone={resultado >= 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"} />
        <KPI label="Anterior" value={fmtBRL(resultadoPrev)} sub="Resultado mês anterior" Icon={Target} tone="bg-chart-2/15 text-chart-2" />
      </div>

      <Tabs defaultValue="lancamentos" className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="diario">Fluxo Diário</TabsTrigger>
          <TabsTrigger value="projetado">Projetado</TabsTrigger>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Data", "Tipo", "Categoria", "Descrição", "Conta", "Pagamento", "Status", "Valor", ""].map((h) => (
                      <th key={h} className="text-left font-semibold px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum lançamento. Clique em "Novo Lançamento".</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">{fmtDate(r.data)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.tipo === "entrada" ? "default" : "destructive"} className={r.tipo === "entrada" ? "bg-success" : ""}>
                          {r.tipo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{r.categoria}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{r.descricao}</td>
                      <td className="px-4 py-3 capitalize">{r.conta}</td>
                      <td className="px-4 py-3">{r.forma_pagamento || "-"}</td>
                      <td className="px-4 py-3"><Badge variant={r.status === "realizado" ? "secondary" : "outline"}>{r.status}</Badge></td>
                      <td className={`px-4 py-3 font-semibold tabular-nums ${r.tipo === "entrada" ? "text-success" : "text-destructive"}`}>{fmtBRL(r.valor)}</td>
                      <td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="diario">
          <Card className="p-5">
            <h2 className="font-semibold mb-4">Fluxo Diário — {month}</h2>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={fluxoDiario}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="saldoFinal" name="Saldo Final" stroke={C[2]} strokeWidth={2} />
                  <Line type="monotone" dataKey="entradas" name="Entradas" stroke={C[0]} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="saidas" name="Saídas" stroke={C[1]} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{["Dia", "Saldo Inicial", "Entradas", "Saídas", "Saldo Final"].map((h) => <th key={h} className="text-left font-semibold px-4 py-2">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {fluxoDiario.filter((d) => d.entradas > 0 || d.saidas > 0).map((d) => (
                    <tr key={d.dia} className="border-t">
                      <td className="px-4 py-2">{d.dia}/{month.slice(5)}</td>
                      <td className="px-4 py-2 tabular-nums">{fmtBRL(d.saldoInicial)}</td>
                      <td className="px-4 py-2 tabular-nums text-success">{fmtBRL(d.entradas)}</td>
                      <td className="px-4 py-2 tabular-nums text-destructive">{fmtBRL(d.saidas)}</td>
                      <td className={`px-4 py-2 tabular-nums font-semibold ${d.saldoFinal < 0 ? "text-destructive" : ""}`}>{fmtBRL(d.saldoFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="projetado">
          <Card className="p-5">
            <h2 className="font-semibold mb-1">Fluxo Projetado — Próximos 30 dias</h2>
            <p className="text-xs text-muted-foreground mb-4">Baseado em contas previstas (a pagar e a receber)</p>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={projetado}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill={C[0]} />
                  <Bar dataKey="saidas" name="Saídas" fill={C[1]} />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke={C[2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="resumo">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI label="Ponto de Equilíbrio" value={fmtBRL(pontoEquilibrio)} sub="Faturamento mínimo p/ não ter prejuízo" Icon={Target} tone="bg-primary/15 text-primary" />
            <KPI label="Queima de Caixa" value={fmtBRL(queimaCaixa)} sub="Gasto total no mês" Icon={TrendingDown} tone="bg-destructive/15 text-destructive" />
            <KPI label="Reserva Necessária" value={fmtBRL(reservaNec)} sub="3 meses de operação" Icon={Wallet} tone="bg-chart-2/15 text-chart-2" />
          </div>
          <Card className="p-5 mt-4">
            <h3 className="font-semibold mb-3">Comparativo Mensal</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Mês atual ({month})</div>
                <div>Entradas: <b className="text-success">{fmtBRL(entradasMes)}</b></div>
                <div>Saídas: <b className="text-destructive">{fmtBRL(saidasMes)}</b></div>
                <div>Resultado: <b>{fmtBRL(resultado)}</b></div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Mês anterior ({prevMonth})</div>
                <div>Entradas: <b className="text-success">{fmtBRL(entradasPrev)}</b></div>
                <div>Saídas: <b className="text-destructive">{fmtBRL(saidasPrev)}</b></div>
                <div>Resultado: <b>{fmtBRL(resultadoPrev)}</b></div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="categorias">
          <Card className="p-5">
            <h2 className="font-semibold mb-4">Saídas por Categoria — {month}</h2>
            {porCategoria.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sem dados no mês selecionado.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={porCategoria} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100} paddingAngle={2}>
                        {porCategoria.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-2 text-sm">
                  {porCategoria.map((c, i) => {
                    const pct = ((c.value / saidasMes) * 100).toFixed(1);
                    return (
                      <li key={c.name} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: C[i % C.length] }} />
                        <span className="flex-1 truncate">{c.name}</span>
                        <span className="text-muted-foreground text-xs">{pct}%</span>
                        <span className="font-medium tabular-nums w-24 text-right">{fmtBRL(c.value)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="contas">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" /> Contas a Pagar ({contasPagar.length})</h3>
              <ContasList rows={contasPagar} />
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" /> Contas a Receber ({contasReceber.length})</h3>
              <ContasList rows={contasReceber} />
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value, sub, Icon, tone }: { label: string; value: string; sub: string; Icon: any; tone: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{sub}</div>
        </div>
        <div className={`h-10 w-10 rounded-md flex items-center justify-center ${tone}`}><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  );
}

function ContasList({ rows }: { rows: Lanc[] }) {
  const today = new Date().toISOString().slice(0, 10);
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">Nenhuma conta pendente.</p>;
  return (
    <ul className="space-y-2 text-sm max-h-96 overflow-y-auto">
      {rows.map((r) => {
        const venc = r.data_vencimento || r.data;
        const vencida = venc < today;
        return (
          <li key={r.id} className={`flex items-center justify-between border-b pb-2 ${vencida ? "text-destructive" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{r.descricao}</div>
              <div className="text-xs text-muted-foreground">{r.cliente_fornecedor || r.categoria} • venc. {fmtDate(venc)}</div>
            </div>
            <span className="font-semibold tabular-nums">{fmtBRL(r.valor)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function NovoLancamento({ onSaved, open, setOpen }: { onSaved: () => void; open: boolean; setOpen: (v: boolean) => void }) {
  const [f, setF] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: "entrada" as "entrada" | "saida",
    categoria: "",
    subcategoria: "",
    descricao: "",
    valor: 0,
    forma_pagamento: "Pix",
    status: "realizado" as "realizado" | "previsto",
    conta: "caixa" as "caixa" | "banco" | "cartao",
    data_vencimento: "",
    data_pagamento: "",
    cliente_fornecedor: "",
    observacoes: "",
  });

  const cats = f.tipo === "entrada" ? CAT_ENT : CAT_SAI;

  const save = async () => {
    if (!f.descricao || !f.valor || !f.categoria) {
      toast.error("Preencha categoria, descrição e valor");
      return;
    }
    const payload: any = { ...f };
    if (!payload.data_vencimento) payload.data_vencimento = null;
    if (!payload.data_pagamento) payload.data_pagamento = null;
    if (!payload.subcategoria) payload.subcategoria = null;
    if (!payload.cliente_fornecedor) payload.cliente_fornecedor = null;
    if (!payload.observacoes) payload.observacoes = null;
    const { error } = await supabase.from("lancamentos").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Lançamento criado");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> Novo Lançamento</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(v: any) => setF({ ...f, tipo: v, categoria: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Status</Label>
            <Select value={f.status} onValueChange={(v: any) => setF({ ...f, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="realizado">Realizado</SelectItem><SelectItem value="previsto">Previsto</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Data</Label><Input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
          <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: Number(e.target.value) })} /></div>
          <div><Label>Categoria</Label>
            <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Subcategoria</Label><Input value={f.subcategoria} onChange={(e) => setF({ ...f, subcategoria: e.target.value })} /></div>
          <div className="col-span-2"><Label>Descrição</Label><Input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></div>
          <div><Label>Forma de Pagamento</Label>
            <Select value={f.forma_pagamento} onValueChange={(v) => setF({ ...f, forma_pagamento: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Dinheiro", "Pix", "Cartão Débito", "Cartão Crédito", "Boleto", "Prazo", "Transferência"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Conta</Label>
            <Select value={f.conta} onValueChange={(v: any) => setF({ ...f, conta: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="caixa">Caixa</SelectItem><SelectItem value="banco">Banco</SelectItem><SelectItem value="cartao">Cartão</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Vencimento</Label><Input type="date" value={f.data_vencimento} onChange={(e) => setF({ ...f, data_vencimento: e.target.value })} /></div>
          <div><Label>Data de Pagamento</Label><Input type="date" value={f.data_pagamento} onChange={(e) => setF({ ...f, data_pagamento: e.target.value })} /></div>
          <div className="col-span-2"><Label>Cliente / Fornecedor</Label><Input value={f.cliente_fornecedor} onChange={(e) => setF({ ...f, cliente_fornecedor: e.target.value })} /></div>
          <div className="col-span-2"><Label>Observações</Label><Textarea value={f.observacoes} onChange={(e) => setF({ ...f, observacoes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
