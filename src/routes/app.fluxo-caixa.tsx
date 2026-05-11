import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Plus, Trash2, AlertTriangle, TrendingUp, TrendingDown, Wallet, Target, Upload, Download, FileText, ArrowLeftRight, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { SheetsSyncTab } from "@/components/SheetsSyncTab";

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

const CAT_ENT = ["Serviços", "Venda de Peças", "Outras Receitas", "Transferência"];
const CAT_SAI = ["Folha de Pagamento", "Compra de Peças", "Aluguel", "Energia", "Água", "Internet", "Impostos", "Encargos Sociais", "Contabilidade", "Marketing", "Manutenção", "Combustível", "EPI", "Outros", "Transferência"];
const CUSTOS_VARIAVEIS = new Set(["Compra de Peças"]);
const C = ["#15803d", "#c2410c", "#0369a1", "#b45309", "#7c3aed", "#be185d", "#0d9488", "#65a30d"];
const CONTAS: ("caixa" | "banco" | "cartao")[] = ["caixa", "banco", "cartao"];
const CONTA_LABEL: Record<string, string> = { caixa: "Caixa", banco: "Banco", cartao: "Cartão" };

function FluxoCaixa() {
  const [rows, setRows] = useState<Lanc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState<"2024" | "2025" | "2026">("2025");
  const [month, setMonth] = useState(`${"2025"}-01`);
  const [saldoInicial, setSaldoInicial] = useState(0);
  const [saldosIniciais, setSaldosIniciais] = useState<Record<string, number>>({ caixa: 0, banco: 0, cartao: 0 });

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

  const entradasMes = realizadosMes.filter((r) => r.tipo === "entrada" && r.categoria !== "Transferência").reduce((s, r) => s + Number(r.valor), 0);
  const saidasMes = realizadosMes.filter((r) => r.tipo === "saida" && r.categoria !== "Transferência").reduce((s, r) => s + Number(r.valor), 0);
  const resultado = entradasMes - saidasMes;
  const margem = entradasMes > 0 ? (resultado / entradasMes) * 100 : 0;

  const prevMonth = (() => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return d.toISOString().slice(0, 7);
  })();
  const realizadosPrev = rows.filter((r) => r.status === "realizado" && (r.data || "").startsWith(prevMonth));
  const entradasPrev = realizadosPrev.filter((r) => r.tipo === "entrada" && r.categoria !== "Transferência").reduce((s, r) => s + Number(r.valor), 0);
  const saidasPrev = realizadosPrev.filter((r) => r.tipo === "saida" && r.categoria !== "Transferência").reduce((s, r) => s + Number(r.valor), 0);
  const resultadoPrev = entradasPrev - saidasPrev;
  const varReceita = entradasPrev > 0 ? ((entradasMes - entradasPrev) / entradasPrev) * 100 : 0;

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

  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    realizadosMes.filter((r) => r.tipo === "saida" && r.categoria !== "Transferência").forEach((r) => { map[r.categoria] = (map[r.categoria] || 0) + Number(r.valor); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [realizadosMes]);

  // ============ DRE ============
  const dre = useMemo(() => {
    const receitaBruta = entradasMes;
    const custoVariavel = realizadosMes.filter((r) => r.tipo === "saida" && CUSTOS_VARIAVEIS.has(r.categoria)).reduce((s, r) => s + Number(r.valor), 0);
    const margemContribuicao = receitaBruta - custoVariavel;
    const custosFixos = realizadosMes.filter((r) => r.tipo === "saida" && !CUSTOS_VARIAVEIS.has(r.categoria) && r.categoria !== "Transferência").reduce((s, r) => s + Number(r.valor), 0);
    const lucroLiquido = margemContribuicao - custosFixos;
    const margemBruta = receitaBruta > 0 ? (margemContribuicao / receitaBruta) * 100 : 0;
    const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
    const percentVariavel = receitaBruta > 0 ? (custoVariavel / receitaBruta) * 100 : 0;
    const percentFixo = receitaBruta > 0 ? (custosFixos / receitaBruta) * 100 : 0;
    const indiceContribuicao = receitaBruta > 0 ? margemContribuicao / receitaBruta : 0;
    const peReceita = indiceContribuicao > 0 ? custosFixos / indiceContribuicao : 0;
    const fixosPorCat: Record<string, number> = {};
    realizadosMes.filter((r) => r.tipo === "saida" && !CUSTOS_VARIAVEIS.has(r.categoria) && r.categoria !== "Transferência").forEach((r) => { fixosPorCat[r.categoria] = (fixosPorCat[r.categoria] || 0) + Number(r.valor); });
    return { receitaBruta, custoVariavel, margemContribuicao, custosFixos, lucroLiquido, margemBruta, margemLiquida, percentVariavel, percentFixo, peReceita, fixosPorCat };
  }, [realizadosMes, entradasMes]);

  // DRE histórico (últimos 6 meses)
  const dreHistorico = useMemo(() => {
    const out: { mes: string; receita: number; lucro: number; margem: number }[] = [];
    const [y, m] = month.split("-").map(Number);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      const ms = d.toISOString().slice(0, 7);
      const reals = rows.filter((r) => r.status === "realizado" && (r.data || "").startsWith(ms));
      const rec = reals.filter((r) => r.tipo === "entrada" && r.categoria !== "Transferência").reduce((s, r) => s + Number(r.valor), 0);
      const cv = reals.filter((r) => r.tipo === "saida" && CUSTOS_VARIAVEIS.has(r.categoria)).reduce((s, r) => s + Number(r.valor), 0);
      const cf = reals.filter((r) => r.tipo === "saida" && !CUSTOS_VARIAVEIS.has(r.categoria) && r.categoria !== "Transferência").reduce((s, r) => s + Number(r.valor), 0);
      const lucro = rec - cv - cf;
      out.push({ mes: ms.slice(2), receita: rec, lucro, margem: rec > 0 ? (lucro / rec) * 100 : 0 });
    }
    return out;
  }, [rows, month]);

  // ============ CONCILIAÇÃO POR CONTA ============
  const saldosPorConta = useMemo(() => {
    const totals: Record<string, { entradas: number; saidas: number; saldo: number }> = {};
    CONTAS.forEach((c) => { totals[c] = { entradas: 0, saidas: 0, saldo: saldosIniciais[c] || 0 }; });
    rows.filter((r) => r.status === "realizado").forEach((r) => {
      const t = totals[r.conta];
      if (!t) return;
      if (r.tipo === "entrada") { t.entradas += Number(r.valor); t.saldo += Number(r.valor); }
      else { t.saidas += Number(r.valor); t.saldo -= Number(r.valor); }
    });
    return totals;
  }, [rows, saldosIniciais]);

  // Contas a pagar/receber
  const contasPagar = rows.filter((r) => r.status === "previsto" && r.tipo === "saida").sort((a, b) => (a.data_vencimento || a.data).localeCompare(b.data_vencimento || b.data));
  const contasReceber = rows.filter((r) => r.status === "previsto" && r.tipo === "entrada").sort((a, b) => (a.data_vencimento || a.data).localeCompare(b.data_vencimento || b.data));

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

  // ============ FILTROS ============
  const [fSearch, setFSearch] = useState("");
  const [fTipo, setFTipo] = useState<"todos" | "entrada" | "saida">("todos");
  const [fCategoria, setFCategoria] = useState<string>("todas");
  const [fStatus, setFStatus] = useState<"todos" | "previsto" | "realizado">("todos");
  const [fConta, setFConta] = useState<string>("todas");
  const [fDe, setFDe] = useState("");
  const [fAte, setFAte] = useState("");

  const lancamentosFiltrados = useMemo(() => {
    return rows.filter((r) => {
      if (!(r.data || "").startsWith(year)) return false;
      if (fTipo !== "todos" && r.tipo !== fTipo) return false;
      if (fStatus !== "todos" && r.status !== fStatus) return false;
      if (fCategoria !== "todas" && r.categoria !== fCategoria) return false;
      if (fConta !== "todas" && r.conta !== fConta) return false;
      if (fDe && r.data < fDe) return false;
      if (fAte && r.data > fAte) return false;
      if (fSearch) {
        const s = fSearch.toLowerCase();
        const hay = `${r.descricao} ${r.categoria} ${r.subcategoria || ""} ${r.cliente_fornecedor || ""} ${r.observacoes || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, year, fSearch, fTipo, fCategoria, fStatus, fConta, fDe, fAte]);

  const todasCategorias = useMemo(() => Array.from(new Set(rows.map((r) => r.categoria))).sort(), [rows]);

  // ============ EXPORT ============
  const exportCSV = (data: Lanc[], filename: string) => {
    const headers = ["Data", "Tipo", "Categoria", "Subcategoria", "Descrição", "Cliente/Fornecedor", "Conta", "Forma Pagamento", "Status", "Vencimento", "Pagamento", "Valor"];
    const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [headers.join(";")];
    data.forEach((r) => {
      lines.push([r.data, r.tipo, r.categoria, r.subcategoria, r.descricao, r.cliente_fornecedor, r.conta, r.forma_pagamento, r.status, r.data_vencimento, r.data_pagamento, Number(r.valor).toFixed(2).replace(".", ",")].map(escape).join(";"));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Entradas do Mês" value={fmtBRL(entradasMes)} sub={`${varReceita >= 0 ? "+" : ""}${varReceita.toFixed(1)}% vs mês ant.`} Icon={TrendingUp} tone="bg-success/15 text-success" />
        <KPI label="Saídas do Mês" value={fmtBRL(saidasMes)} sub={`Mês anterior: ${fmtBRL(saidasPrev)}`} Icon={TrendingDown} tone="bg-destructive/15 text-destructive" />
        <KPI label="Resultado" value={fmtBRL(resultado)} sub={`Margem ${margem.toFixed(1)}%`} Icon={Wallet} tone={resultado >= 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"} />
        <KPI label="Anterior" value={fmtBRL(resultadoPrev)} sub="Resultado mês anterior" Icon={Target} tone="bg-chart-2/15 text-chart-2" />
      </div>

      <Tabs defaultValue="lancamentos" className="space-y-4">
        <TabsList className="grid grid-cols-3 lg:grid-cols-9 w-full">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="diario">Diário</TabsTrigger>
          <TabsTrigger value="projetado">Projetado</TabsTrigger>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="conciliacao">Conciliação</TabsTrigger>
          <TabsTrigger value="sheets">Sheets</TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="space-y-3">
          <Card className="p-3 flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[180px]"><Label className="text-xs">Buscar</Label><Input placeholder="Descrição, cliente..." value={fSearch} onChange={(e) => setFSearch(e.target.value)} /></div>
            <div><Label className="text-xs">Tipo</Label>
              <Select value={fTipo} onValueChange={(v: any) => setFTipo(v)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Categoria</Label>
              <Select value={fCategoria} onValueChange={setFCategoria}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="todas">Todas</SelectItem>{todasCategorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={fStatus} onValueChange={(v: any) => setFStatus(v)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="realizado">Realizado</SelectItem><SelectItem value="previsto">Previsto</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Conta</Label>
              <Select value={fConta} onValueChange={setFConta}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="todas">Todas</SelectItem>{CONTAS.map((c) => <SelectItem key={c} value={c}>{CONTA_LABEL[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">De</Label><Input type="date" value={fDe} onChange={(e) => setFDe(e.target.value)} className="w-40" /></div>
            <div><Label className="text-xs">Até</Label><Input type="date" value={fAte} onChange={(e) => setFAte(e.target.value)} className="w-40" /></div>
            <Button variant="outline" size="sm" onClick={() => { setFSearch(""); setFTipo("todos"); setFCategoria("todas"); setFStatus("todos"); setFConta("todas"); setFDe(""); setFAte(""); }}>Limpar</Button>
            <Button variant="outline" size="sm" onClick={() => exportCSV(lancamentosFiltrados, `lancamentos-${year}.csv`)}><Download className="h-4 w-4 mr-1" /> Excel/CSV</Button>
            <ImportCSV onImported={load} />
          </Card>
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
                  ) : lancamentosFiltrados.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Nenhum lançamento encontrado.</td></tr>
                  ) : lancamentosFiltrados.map((r) => (
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
            <div className="px-4 py-2 text-xs text-muted-foreground border-t">{lancamentosFiltrados.length} registro(s)</div>
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

        {/* ============ DRE ============ */}
        <TabsContent value="dre" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="font-semibold">DRE Gerencial — {month}</h2>
                <p className="text-xs text-muted-foreground">Demonstração do Resultado do Exercício (regime de competência simplificado)</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Imprimir / PDF</Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
              <KPI label="Margem Bruta" value={`${dre.margemBruta.toFixed(1)}%`} sub="Após custos variáveis" Icon={TrendingUp} tone="bg-success/15 text-success" />
              <KPI label="Margem Líquida" value={`${dre.margemLiquida.toFixed(1)}%`} sub="Lucro / Receita" Icon={Wallet} tone={dre.margemLiquida >= 0 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"} />
              <KPI label="Custo Variável" value={`${dre.percentVariavel.toFixed(1)}%`} sub={fmtBRL(dre.custoVariavel)} Icon={TrendingDown} tone="bg-warning/15 text-warning" />
              <KPI label="Custo Fixo" value={`${dre.percentFixo.toFixed(1)}%`} sub={fmtBRL(dre.custosFixos)} Icon={TrendingDown} tone="bg-destructive/15 text-destructive" />
              <KPI label="Ponto Equilíbrio" value={fmtBRL(dre.peReceita)} sub="Receita p/ lucro zero" Icon={Target} tone="bg-chart-2/15 text-chart-2" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <DreRow label="(=) Receita Bruta" value={dre.receitaBruta} bold />
                  <DreRow label="(−) Custos Variáveis (Peças)" value={-dre.custoVariavel} pct={dre.percentVariavel} />
                  <DreRow label="(=) Margem de Contribuição" value={dre.margemContribuicao} pct={dre.margemBruta} bold />
                  <tr><td colSpan={3} className="px-4 pt-3 pb-1 text-xs text-muted-foreground uppercase">Custos Fixos</td></tr>
                  {Object.entries(dre.fixosPorCat).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                    <DreRow key={cat} label={`   ${cat}`} value={-val} muted />
                  ))}
                  <DreRow label="(−) Total Custos Fixos" value={-dre.custosFixos} pct={dre.percentFixo} />
                  <DreRow label="(=) Lucro Líquido" value={dre.lucroLiquido} pct={dre.margemLiquida} bold highlight />
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3">Evolução — Últimos 6 meses</h3>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={dreHistorico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={11} />
                  <YAxis yAxisId="left" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" fontSize={11} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip formatter={(v: any, n: any) => n === "margem" ? `${Number(v).toFixed(1)}%` : fmtBRL(Number(v))} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="receita" name="Receita" fill={C[0]} />
                  <Bar yAxisId="left" dataKey="lucro" name="Lucro" fill={C[2]} />
                  <Line yAxisId="right" type="monotone" dataKey="margem" name="Margem %" stroke={C[1]} strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* ============ CONCILIAÇÃO ============ */}
        <TabsContent value="conciliacao" className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="font-semibold">Conciliação Bancária</h2>
                <p className="text-xs text-muted-foreground">Saldos por conta e transferências internas</p>
              </div>
              <TransferenciaDialog onSaved={load} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {CONTAS.map((c) => {
                const t = saldosPorConta[c];
                return (
                  <Card key={c} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold capitalize">{CONTA_LABEL[c]}</div>
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">Saldo inicial</div>
                    <Input type="number" value={saldosIniciais[c]} onChange={(e) => setSaldosIniciais({ ...saldosIniciais, [c]: Number(e.target.value) })} className="h-8 mb-2" />
                    <div className="text-xs text-muted-foreground">Entradas: <span className="text-success">{fmtBRL(t.entradas)}</span></div>
                    <div className="text-xs text-muted-foreground">Saídas: <span className="text-destructive">{fmtBRL(t.saidas)}</span></div>
                    <div className={`text-2xl font-bold mt-2 ${t.saldo < 0 ? "text-destructive" : ""}`}>{fmtBRL(t.saldo)}</div>
                    <div className="text-xs text-muted-foreground">Saldo atual</div>
                  </Card>
                );
              })}
            </div>
          </Card>

          {CONTAS.map((c) => {
            const lancsConta = rows.filter((r) => r.conta === c && (r.data || "").startsWith(year)).slice(0, 50);
            return (
              <Card key={c} className="p-5">
                <h3 className="font-semibold mb-3 capitalize">Extrato — {CONTA_LABEL[c]} ({lancsConta.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50"><tr>{["Data","Descrição","Categoria","Tipo","Valor","Status"].map((h) => <th key={h} className="text-left font-semibold px-3 py-2">{h}</th>)}</tr></thead>
                    <tbody>
                      {lancsConta.length === 0 ? (
                        <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">Sem movimentações</td></tr>
                      ) : lancsConta.map((r) => (
                        <tr key={r.id} className="border-t">
                          <td className="px-3 py-2">{fmtDate(r.data)}</td>
                          <td className="px-3 py-2 max-w-xs truncate">{r.descricao}</td>
                          <td className="px-3 py-2">{r.categoria}</td>
                          <td className="px-3 py-2 capitalize">{r.tipo}</td>
                          <td className={`px-3 py-2 font-semibold tabular-nums ${r.tipo === "entrada" ? "text-success" : "text-destructive"}`}>{r.tipo === "entrada" ? "+" : "-"}{fmtBRL(r.valor)}</td>
                          <td className="px-3 py-2"><Badge variant={r.status === "realizado" ? "secondary" : "outline"}>{r.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
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

function DreRow({ label, value, pct, bold, highlight, muted }: { label: string; value: number; pct?: number; bold?: boolean; highlight?: boolean; muted?: boolean }) {
  return (
    <tr className={`border-t ${highlight ? "bg-primary/5" : ""}`}>
      <td className={`px-4 py-2 ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""} whitespace-pre`}>{label}</td>
      <td className={`px-4 py-2 text-right tabular-nums ${bold ? "font-semibold" : ""} ${value < 0 ? "text-destructive" : value > 0 ? "" : ""}`}>{fmtBRL(value)}</td>
      <td className="px-4 py-2 text-right tabular-nums text-xs text-muted-foreground w-20">{pct !== undefined ? `${pct.toFixed(1)}%` : ""}</td>
    </tr>
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

function ImportCSV({ onImported }: { onImported: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const handle = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) { toast.error("Arquivo vazio"); return; }
    const sep = lines[0].includes(";") ? ";" : ",";
    const header = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
    const idx = (k: string) => header.findIndex((h) => h.includes(k));
    const iData = idx("data");
    const iDesc = idx("descri") >= 0 ? idx("descri") : idx("histor");
    const iValor = idx("valor");
    const iTipo = idx("tipo");
    if (iData < 0 || iDesc < 0 || iValor < 0) { toast.error("CSV precisa ter colunas: data, descrição/histórico, valor"); return; }
    const items: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
      const dRaw = cols[iData];
      const valRaw = cols[iValor].replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, "");
      const valor = Math.abs(Number(valRaw));
      if (!dRaw || !valor) continue;
      let data = dRaw;
      if (/^\d{2}\/\d{2}\/\d{4}/.test(dRaw)) {
        const [d, m, y] = dRaw.split("/");
        data = `${y}-${m}-${d}`;
      }
      const tipo = iTipo >= 0 ? (cols[iTipo].toLowerCase().includes("entrada") || cols[iTipo].toLowerCase().includes("credit") ? "entrada" : "saida") : (Number(valRaw) >= 0 ? "entrada" : "saida");
      items.push({ data, tipo, categoria: tipo === "entrada" ? "Outras Receitas" : "Outros", descricao: cols[iDesc] || "Importado", valor, status: "realizado", conta: "banco" });
    }
    if (!items.length) { toast.error("Nenhuma linha válida"); return; }
    const { error } = await supabase.from("lancamentos").insert(items);
    if (error) { toast.error(error.message); return; }
    toast.success(`${items.length} lançamento(s) importado(s)`);
    onImported();
  };
  return (
    <>
      <input ref={ref} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} />
      <Button variant="outline" size="sm" onClick={() => ref.current?.click()}><Upload className="h-4 w-4 mr-1" /> Importar CSV</Button>
    </>
  );
}

function TransferenciaDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [origem, setOrigem] = useState<"caixa" | "banco" | "cartao">("caixa");
  const [destino, setDestino] = useState<"caixa" | "banco" | "cartao">("banco");
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [desc, setDesc] = useState("");

  const save = async () => {
    if (origem === destino) { toast.error("Contas devem ser diferentes"); return; }
    if (!valor) { toast.error("Informe o valor"); return; }
    const descricao = desc || `Transferência ${CONTA_LABEL[origem]} → ${CONTA_LABEL[destino]}`;
    const { error } = await supabase.from("lancamentos").insert([
      { data, tipo: "saida", categoria: "Transferência", descricao, valor, status: "realizado", conta: origem },
      { data, tipo: "entrada", categoria: "Transferência", descricao, valor, status: "realizado", conta: destino },
    ]);
    if (error) { toast.error(error.message); return; }
    toast.success("Transferência registrada");
    setOpen(false); setValor(0); setDesc("");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><ArrowLeftRight className="h-4 w-4 mr-1" /> Nova Transferência</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Transferência entre Contas</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>De</Label>
            <Select value={origem} onValueChange={(v: any) => setOrigem(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONTAS.map((c) => <SelectItem key={c} value={c}>{CONTA_LABEL[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Para</Label>
            <Select value={destino} onValueChange={(v: any) => setDestino(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CONTAS.map((c) => <SelectItem key={c} value={c}>{CONTA_LABEL[c]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Valor</Label><Input type="number" step="0.01" value={valor} onChange={(e) => setValor(Number(e.target.value))} /></div>
          <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div className="col-span-2"><Label>Descrição (opcional)</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save}>Transferir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
