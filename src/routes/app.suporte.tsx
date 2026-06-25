import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import {
  MessageSquare, Send, Plus, ArrowLeft, CheckCircle2, Shield, HelpCircle,
  Search, LifeBuoy, BookOpen, Mail, Clock, Sparkles, Inbox, ChevronRight,
  FileDown,
} from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { exportTicketPdf, exportTicketsPdf } from "@/lib/support-pdf";
import { FAQS, FAQ_CATEGORIES } from "@/lib/support-faqs";
import {
  listTickets,
  getTicketMessages,
  createTicket,
  addMessage,
  setTicketStatus,
} from "@/lib/support.functions";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/suporte")({
  component: SuportePage,
  head: () => ({ meta: [{ title: "Central de Ajuda | Auto Mecânica Bledon" }] }),
});

type Ticket = {
  id: string;
  user_id: string;
  tipo: "duvida" | "feedback";
  assunto: string;
  status: "aberto" | "respondido" | "resolvido";
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  ticket_id: string;
  user_id: string;
  is_admin: boolean;
  mensagem: string;
  created_at: string;
};

const statusColors: Record<string, string> = {
  aberto: "bg-warning/15 text-warning-foreground border-warning/40",
  respondido: "bg-chart-2/15 text-chart-2 border-chart-2/40",
  resolvido: "bg-success/15 text-success border-success/40",
};

const statusLabel: Record<string, string> = {
  aberto: "Aberto",
  respondido: "Respondido",
  resolvido: "Resolvido",
};

function SuportePage() {
  const listFn = useServerFn(listTickets);
  const msgsFn = useServerFn(getTicketMessages);
  const createFn = useServerFn(createTicket);
  const addFn = useServerFn(addMessage);
  const statusFn = useServerFn(setTicketStatus);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"duvida" | "feedback" | "resolvido">("duvida");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportFiltered = async () => {
    if (!filtered.length) {
      toast.info("Nenhum ticket para exportar nesta aba");
      return;
    }
    setExporting(true);
    try {
      const items = [];
      for (const t of filtered) {
        const m: any = await msgsFn({ data: { ticketId: t.id } });
        items.push({ ticket: t, messages: m, author: authors[t.user_id] });
      }
      const title =
        tab === "duvida" ? "Dúvidas" : tab === "feedback" ? "Feedbacks" : "Resolvidos";
      exportTicketsPdf(title, items);
      toast.success("PDF gerado");
    } catch (e: any) {
      toast.error(e.message || "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  };

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await listFn({});
      setTickets(res.tickets);
      setAuthors(res.authors || {});
      setIsAdmin(res.isAdmin);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar tickets");
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => { reload(); }, [reload]);

  const openTicket = async (t: Ticket) => {
    setSelected(t);
    setMessages([]);
    try {
      const m: any = await msgsFn({ data: { ticketId: t.id } });
      setMessages(m);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    try {
      await addFn({ data: { ticketId: selected.id, mensagem: reply } });
      setReply("");
      const m: any = await msgsFn({ data: { ticketId: selected.id } });
      setMessages(m);
      reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const resolve = async () => {
    if (!selected) return;
    try {
      await statusFn({ data: { ticketId: selected.id, status: "resolvido" } });
      toast.success("Ticket marcado como resolvido");
      setSelected({ ...selected, status: "resolvido" });
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const stats = useMemo(() => {
    const abertos = tickets.filter((t) => t.status === "aberto").length;
    const respondidos = tickets.filter((t) => t.status === "respondido").length;
    const resolvidos = tickets.filter((t) => t.status === "resolvido").length;
    return { abertos, respondidos, resolvidos, total: tickets.length };
  }, [tickets]);

  const filtered = tickets.filter((t) =>
    tab === "resolvido" ? t.status === "resolvido" : t.tipo === tab && t.status !== "resolvido"
  );

  // ===================== TICKET DETAIL =====================
  if (selected) {
    const canReply =
      isAdmin || (selected.tipo === "duvida" && selected.status !== "resolvido");
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelected(null); reload(); }}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para central
        </Button>
        <div className="flex justify-end -mt-10">
          <Button variant="outline" size="sm" onClick={() => exportTicketPdf(selected, messages, authors[selected.user_id])}>
            <FileDown className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
        </div>

        <Card className="p-5 border-l-4 border-l-primary">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-1">
                <Badge variant="outline" className="font-normal">
                  {selected.tipo === "feedback" ? "Feedback" : "Dúvida"}
                </Badge>
                <span>•</span>
                <Clock className="h-3 w-3" />
                <span>Atualizado {fmtDate(selected.updated_at)}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold leading-tight">{selected.assunto}</h2>
              {isAdmin && authors[selected.user_id] && (
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {authors[selected.user_id]}
                </div>
              )}
            </div>
            <Badge variant="outline" className={statusColors[selected.status]}>
              {statusLabel[selected.status]}
            </Badge>
          </div>
        </Card>

        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3",
                m.is_admin ? "flex-row" : "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                  m.is_admin
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {m.is_admin ? <Shield className="h-4 w-4" /> : "EU"}
              </div>
              <Card
                className={cn(
                  "p-4 max-w-[80%]",
                  m.is_admin ? "bg-primary/5 border-primary/30" : "bg-card"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5 text-[11px] text-muted-foreground">
                  <span className="font-medium">
                    {m.is_admin ? "Equipe de Suporte" : "Você"}
                  </span>
                  <span>•</span>
                  <span>{fmtDate(m.created_at)}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.mensagem}</div>
              </Card>
            </div>
          ))}
        </div>

        {canReply ? (
          <Card className="p-4 space-y-3 sticky bottom-4 shadow-lg border-primary/20">
            <Label className="text-sm font-medium">
              {isAdmin ? "Responder como suporte" : "Sua resposta"}
            </Label>
            <Textarea
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Escreva sua mensagem..."
              className="resize-none"
            />
            <div className="flex justify-between items-center gap-2 flex-wrap">
              {isAdmin && selected.status !== "resolvido" && (
                <Button variant="outline" size="sm" onClick={resolve}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como resolvido
                </Button>
              )}
              <Button onClick={sendReply} disabled={sending || !reply.trim()} className="ml-auto">
                <Send className="h-4 w-4 mr-2" /> {sending ? "Enviando..." : "Enviar resposta"}
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-4 text-sm text-muted-foreground text-center">
            {selected.tipo === "feedback"
              ? "Feedback enviado — aguardando análise da equipe."
              : "Este ticket foi resolvido. Abra um novo se precisar de mais ajuda."}
          </Card>
        )}
      </div>
    );
  }

  // ===================== HELP CENTER HOME =====================
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--primary)/0.15), transparent 40%), radial-gradient(circle at 80% 0%, hsl(var(--primary)/0.1), transparent 50%)",
        }} />
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Central de Ajuda</span>
              {isAdmin && (
                <Badge variant="default" className="gap-1 ml-2">
                  <Shield className="h-3 w-3" /> Admin
                </Badge>
              )}
            </div>
            <NewTicketDialog onCreated={reload} createFn={createFn} />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Como podemos te ajudar hoje?
          </h1>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            {isAdmin
              ? "Gerencie dúvidas e feedbacks de todos os usuários da oficina."
              : "Encontre respostas rápidas, leia nossa base de conhecimento ou fale com o suporte."}
          </p>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={BookOpen} label="Artigos" value={FAQS.length} hint="na base" />
            <StatCard icon={Inbox} label="Seus tickets" value={stats.total} hint="no total" />
            <StatCard icon={Clock} label="Em aberto" value={stats.abertos} hint="aguardando" tone="warning" />
            <StatCard icon={CheckCircle2} label="Resolvidos" value={stats.resolvidos} hint="finalizados" tone="success" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQ (main) */}
        <div className="lg:col-span-2 space-y-4">
          <FaqSection />
        </div>

        {/* Sidebar - Tickets */}
        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" /> Meus tickets
              </h2>
              <NewTicketDialog onCreated={reload} createFn={createFn} compact />
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="duvida">
                  Dúvidas ({tickets.filter(t => t.tipo === "duvida" && t.status !== "resolvido").length})
                </TabsTrigger>
                <TabsTrigger value="feedback">
                  Feedback ({tickets.filter(t => t.tipo === "feedback" && t.status !== "resolvido").length})
                </TabsTrigger>
                <TabsTrigger value="resolvido">
                  Resolvidos ({tickets.filter(t => t.status === "resolvido").length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="mt-3">
                {loading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-md bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Nenhum {tab === "duvida" ? "ticket" : tab === "feedback" ? "feedback" : "ticket resolvido"} ainda.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[480px] overflow-y-auto -mx-1 px-1">
                    {filtered.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => openTicket(t)}
                        className="w-full text-left p-3 rounded-md border border-border/50 bg-card hover:bg-accent/50 hover:border-primary/40 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-medium text-sm truncate flex-1">{t.assunto}</div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground truncate">
                            {fmtDate(t.updated_at)}
                            {isAdmin && authors[t.user_id] && <> • {authors[t.user_id]}</>}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusColors[t.status])}>
                            {statusLabel[t.status]}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Precisa falar com alguém?</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Nossa equipe responde dúvidas em até 24h úteis.
                </p>
                <NewTicketDialog onCreated={reload} createFn={createFn} label="Abrir novo ticket" />
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, hint, tone,
}: {
  icon: any; label: string; value: number; hint?: string; tone?: "warning" | "success";
}) {
  const toneCls =
    tone === "warning" ? "text-warning" :
    tone === "success" ? "text-success" :
    "text-primary";
  return (
    <Card className="p-3 md:p-4 bg-card/60 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className={cn("h-3.5 w-3.5", toneCls)} />
        {label}
      </div>
      <div className="text-2xl font-bold leading-none">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </Card>
  );
}

function NewTicketDialog({
  onCreated, createFn, compact, label,
}: { onCreated: () => void; createFn: any; compact?: boolean; label?: string }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"duvida" | "feedback">("duvida");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!assunto.trim() || !mensagem.trim()) {
      toast.error("Preencha assunto e mensagem");
      return;
    }
    setBusy(true);
    try {
      await createFn({ data: { tipo, assunto, mensagem } });
      toast.success(tipo === "feedback" ? "Feedback enviado!" : "Dúvida registrada!");
      setOpen(false);
      setAssunto(""); setMensagem(""); setTipo("duvida");
      onCreated();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button size="sm" variant="outline" className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo
          </Button>
        ) : (
          <Button size="lg" className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> {label || "Novo ticket"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir novo ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="duvida">Dúvida (com resposta)</SelectItem>
                <SelectItem value="feedback">Feedback (envio único)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assunto</Label>
            <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} maxLength={200} placeholder="Ex.: dúvida sobre cadastro de OS" />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} maxLength={4000} placeholder="Descreva sua dúvida ou feedback..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Enviando..." : "Enviar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FaqSection() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("Todas");

  const q = query.trim().toLowerCase();
  const filtered = FAQS.filter((f) => {
    const matchCat = cat === "Todas" || f.categoria === cat;
    if (!q) return matchCat;
    return (
      matchCat &&
      (f.pergunta.toLowerCase().includes(q) ||
        f.resposta.toLowerCase().includes(q) ||
        f.categoria.toLowerCase().includes(q))
    );
  });

  const counts = useMemo(() => {
    const m: Record<string, number> = { Todas: FAQS.length };
    for (const c of FAQ_CATEGORIES) m[c] = FAQS.filter((f) => f.categoria === c).length;
    return m;
  }, []);

  return (
    <Card className="p-5 md:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <HelpCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Base de conhecimento</h2>
            <p className="text-sm text-muted-foreground">
              {FAQS.length} artigos para resolver as dúvidas mais comuns.
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar artigos, palavras-chave..."
          className="pl-9 h-11"
        />
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-1.5">
        {["Todas", ...FAQ_CATEGORIES].map((c) => {
          const active = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {c} <span className="opacity-70">({counts[c] ?? 0})</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10 border border-dashed rounded-lg">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhuma FAQ encontrada para sua busca.
          <div className="text-xs mt-1">Tente outros termos ou abra um ticket.</div>
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {filtered.map((f) => (
            <AccordionItem key={f.id} value={f.id} className="border-b last:border-b-0">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-start gap-3 text-left">
                  <span className="mt-0.5 h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <HelpCircle className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">
                      {f.categoria}
                    </span>
                    <span className="font-medium">{f.pergunta}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-9">
                <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                  {f.resposta}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </Card>
  );
}
