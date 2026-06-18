import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
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
import { MessageSquare, Send, Plus, ArrowLeft, CheckCircle2, Shield, HelpCircle, Search } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { FAQS, FAQ_CATEGORIES } from "@/lib/support-faqs";
import {
  listTickets,
  getTicketMessages,
  createTicket,
  addMessage,
  setTicketStatus,
} from "@/lib/support.functions";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/app/suporte")({
  component: SuportePage,
  head: () => ({ meta: [{ title: "Suporte | Auto Mecânica Bledon" }] }),
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
  aberto: "bg-warning/20 text-warning-foreground border-warning/30",
  respondido: "bg-chart-2/20 border-chart-2/40",
  resolvido: "bg-success/20 border-success/40",
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
  const [tab, setTab] = useState<"duvida" | "feedback">("duvida");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

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

  const filtered = tickets.filter((t) => t.tipo === tab);

  if (selected) {
    const canReply =
      isAdmin ||
      (selected.tipo === "duvida" && selected.status !== "resolvido");
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelected(null); reload(); }}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {selected.tipo === "feedback" ? "Feedback" : "Dúvida"}
              </div>
              <h2 className="text-xl font-bold">{selected.assunto}</h2>
              {isAdmin && authors[selected.user_id] && (
                <div className="text-xs text-muted-foreground mt-1">De: {authors[selected.user_id]}</div>
              )}
            </div>
            <Badge variant="outline" className={statusColors[selected.status]}>{selected.status}</Badge>
          </div>
        </Card>

        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className={`p-4 ${m.is_admin ? "bg-primary/5 border-primary/30" : ""}`}>
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                {m.is_admin ? (
                  <Badge variant="default" className="gap-1"><Shield className="h-3 w-3" /> Suporte</Badge>
                ) : (
                  <Badge variant="secondary">Cliente</Badge>
                )}
                <span>{fmtDate(m.created_at)}</span>
              </div>
              <div className="whitespace-pre-wrap text-sm">{m.mensagem}</div>
            </Card>
          ))}
        </div>

        {canReply ? (
          <Card className="p-4 space-y-3">
            <Label>{isAdmin ? "Responder como suporte" : "Sua resposta"}</Label>
            <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escreva sua mensagem..." />
            <div className="flex justify-between items-center gap-2">
              {isAdmin && selected.status !== "resolvido" && (
                <Button variant="outline" size="sm" onClick={resolve}>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como resolvido
                </Button>
              )}
              <Button onClick={sendReply} disabled={sending || !reply.trim()} className="ml-auto">
                <Send className="h-4 w-4 mr-2" /> {sending ? "Enviando..." : "Enviar"}
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> Suporte
            {isAdmin && <Badge variant="default" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Gerencie dúvidas e feedbacks de todos os usuários." : "Tire dúvidas e envie feedback. Só você e o suporte veem suas mensagens."}
          </p>
        </div>
        <NewTicketDialog onCreated={reload} createFn={createFn} />
      </div>

      <FaqSection />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="duvida">Dúvidas ({tickets.filter(t => t.tipo === "duvida").length})</TabsTrigger>
          <TabsTrigger value="feedback">Feedback ({tickets.filter(t => t.tipo === "feedback").length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Nenhum {tab === "duvida" ? "ticket" : "feedback"} ainda.
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => (
                <Card
                  key={t.id}
                  className="p-4 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => openTicket(t)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{t.assunto}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {fmtDate(t.updated_at)}
                        {isAdmin && authors[t.user_id] && <> • {authors[t.user_id]}</>}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColors[t.status]}>{t.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewTicketDialog({ onCreated, createFn }: { onCreated: () => void; createFn: any }) {
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
        <Button><Plus className="h-4 w-4 mr-2" /> Novo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo ticket</DialogTitle>
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

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start gap-3">
        <HelpCircle className="h-5 w-5 text-primary mt-1 shrink-0" />
        <div className="flex-1">
          <h2 className="font-semibold">Perguntas frequentes</h2>
          <p className="text-sm text-muted-foreground">
            Antes de abrir um ticket, veja se sua dúvida já está respondida abaixo.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nas FAQs..."
            className="pl-9"
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todas">Todas as categorias</SelectItem>
            {FAQ_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          Nenhuma FAQ encontrada. Abra um ticket acima para falar com o suporte.
        </div>
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {filtered.map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger>
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {f.categoria}
                  </span>
                  <span>{f.pergunta}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
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
