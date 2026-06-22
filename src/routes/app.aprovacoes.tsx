import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ShieldCheck, Check, X, RotateCcw, Mail, Clock } from "lucide-react";
import { listApprovals, setApprovalStatus } from "@/lib/approvals.functions";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/app/aprovacoes")({
  component: AprovacoesPage,
  head: () => ({ meta: [{ title: "Aprovações | Auto Mecânica Bledon" }] }),
});

type Row = {
  user_id: string;
  email: string | null;
  status: "pendente" | "aprovado" | "rejeitado";
  requested_at: string;
  decided_at: string | null;
};

function AprovacoesPage() {
  const listFn = useServerFn(listApprovals);
  const setFn = useServerFn(setApprovalStatus);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pendente" | "aprovado" | "rejeitado">("pendente");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await listFn({});
      setRows(r);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => { reload(); }, [reload]);

  const act = async (userId: string, status: Row["status"]) => {
    try {
      await setFn({ data: { userId, status } });
      toast.success("Atualizado");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = rows.filter((r) => r.status === tab);
  const count = (s: Row["status"]) => rows.filter((r) => r.status === s).length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Aprovações de Cadastros</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Libere o acesso ao sistema para novos usuários que se cadastraram.
      </p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="pendente">Pendentes ({count("pendente")})</TabsTrigger>
          <TabsTrigger value="aprovado">Aprovados ({count("aprovado")})</TabsTrigger>
          <TabsTrigger value="rejeitado">Rejeitados ({count("rejeitado")})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-2">
          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />)
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Nenhum cadastro {tab}.
            </Card>
          ) : (
            filtered.map((r) => (
              <Card key={r.user_id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{r.email || r.user_id}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" /> solicitado em {fmtDate(r.requested_at)}
                    {r.decided_at && <> • decidido em {fmtDate(r.decided_at)}</>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{r.status}</Badge>
                  {r.status === "pendente" && (
                    <>
                      <Button size="sm" onClick={() => act(r.user_id, "aprovado")}>
                        <Check className="h-4 w-4 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => act(r.user_id, "rejeitado")}>
                        <X className="h-4 w-4 mr-1" /> Rejeitar
                      </Button>
                    </>
                  )}
                  {r.status === "rejeitado" && (
                    <Button size="sm" variant="outline" onClick={() => act(r.user_id, "aprovado")}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Aprovar
                    </Button>
                  )}
                  {r.status === "aprovado" && (
                    <Button size="sm" variant="ghost" onClick={() => act(r.user_id, "rejeitado")}>
                      Revogar
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
