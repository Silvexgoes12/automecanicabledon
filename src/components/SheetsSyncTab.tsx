import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, RefreshCw, ExternalLink, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { syncSheets, getSheetsConfig } from "@/lib/sheets.functions";

export function SheetsSyncTab({ onSynced }: { onSynced?: () => void }) {
  const sync = useServerFn(syncSheets);
  const getCfg = useServerFn(getSheetsConfig);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState<"pull" | "push" | "both" | null>(null);
  const [cfg, setCfg] = useState<any>(null);

  useEffect(() => {
    getCfg({}).then((c: any) => {
      if (c) {
        setCfg(c);
        setUrl(`https://docs.google.com/spreadsheets/d/${c.spreadsheet_id}/edit`);
      }
    }).catch(() => {});
  }, []);

  const run = async (mode: "pull" | "push" | "both") => {
    if (!url.trim()) { toast.error("Informe a URL ou ID da planilha"); return; }
    setBusy(mode);
    try {
      const res: any = await sync({ data: { spreadsheetUrl: url, mode } });
      setCfg((c: any) => ({ ...(c || {}), last_sync_at: res.at, last_sync_summary: res, spreadsheet_id: c?.spreadsheet_id || url }));
      const errs = res.errors?.length ? ` • ${res.errors.length} erro(s)` : "";
      toast.success(`Sync ok: +${res.created} criados, ${res.updatedInApp} atualizados, ${res.pushedToSheet} enviados${errs}`);
      onSynced?.();
    } catch (e: any) {
      toast.error(e.message || "Falha na sincronização");
    } finally {
      setBusy(null);
    }
  };

  const summary = cfg?.last_sync_summary;

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Sincronização com Google Sheets</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Conecte uma planilha do Google Sheets para editar seus lançamentos em formato planilha.
          A primeira vez crie uma planilha em branco, cole a URL aqui e clique em <b>Enviar do App → Sheets</b>.
          O app criará a aba <code>Lancamentos</code> com cabeçalho. Depois edite no Sheets e use <b>Puxar do Sheets → App</b>.
        </p>

        <div className="space-y-2">
          <Label>URL ou ID da planilha</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            {url && (
              <Button variant="outline" size="icon" asChild>
                <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button onClick={() => run("pull")} disabled={!!busy} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {busy === "pull" ? "Puxando..." : "Puxar do Sheets"}
          </Button>
          <Button onClick={() => run("push")} disabled={!!busy} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            {busy === "push" ? "Enviando..." : "Enviar para Sheets"}
          </Button>
          <Button onClick={() => run("both")} disabled={!!busy}>
            <RefreshCw className={`h-4 w-4 mr-2 ${busy === "both" ? "animate-spin" : ""}`} />
            {busy === "both" ? "Sincronizando..." : "Sincronizar tudo"}
          </Button>
        </div>

        {cfg?.last_sync_at && (
          <div className="border-t pt-3 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Última sincronização</Badge>
              <span className="text-muted-foreground">{new Date(cfg.last_sync_at).toLocaleString("pt-BR")}</span>
            </div>
            {summary && (
              <div className="text-muted-foreground">
                Criados: <b>{summary.created}</b> • Atualizados no app: <b>{summary.updatedInApp}</b> • Enviados para Sheets: <b>{summary.pushedToSheet}</b>
                {summary.errors?.length ? <> • <span className="text-destructive">Erros: {summary.errors.length}</span></> : null}
              </div>
            )}
            {summary?.errors?.length ? (
              <ul className="mt-2 text-xs text-destructive list-disc pl-5 max-h-32 overflow-auto">
                {summary.errors.slice(0, 20).map((e: string, i: number) => <li key={i}>{e}</li>)}
              </ul>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-2">Formato esperado da aba <code>Lancamentos</code></h3>
        <p className="text-sm text-muted-foreground mb-3">
          Colunas (na ordem): <code>sync_id, data (AAAA-MM-DD ou DD/MM/AAAA), tipo (entrada/saida), categoria, descricao, valor, conta (caixa/banco/cartao), status (previsto/realizado), data_pagamento, updated_at</code>.
          Deixe <code>sync_id</code> vazio para criar novos lançamentos — o app preenche depois.
        </p>
      </Card>
    </div>
  );
}
