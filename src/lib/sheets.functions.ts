import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

const HEADERS = ["sync_id", "data", "tipo", "categoria", "descricao", "valor", "conta", "status", "data_pagamento", "updated_at"];

type Lanc = {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  categoria: string;
  descricao: string;
  valor: number;
  conta: "caixa" | "banco" | "cartao";
  status: "previsto" | "realizado";
  data_pagamento: string | null;
  updated_at: string;
  sync_external_id: string | null;
};

function authHeaders() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
  if (!GOOGLE_SHEETS_API_KEY) throw new Error("GOOGLE_SHEETS_API_KEY ausente — reconecte o Google Sheets");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
    "Content-Type": "application/json",
  };
}

function extractSpreadsheetId(input: string): string {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : input.trim();
}

async function readSheet(spreadsheetId: string, sheetName: string) {
  const range = `${sheetName}!A1:J100000`;
  const r = await fetch(`${GATEWAY}/spreadsheets/${spreadsheetId}/values/${range}`, { headers: authHeaders() });
  if (r.status === 400 || r.status === 404) return null; // sheet missing
  if (!r.ok) throw new Error(`Sheets read [${r.status}]: ${await r.text()}`);
  const j = await r.json();
  return (j.values as string[][]) || [];
}

async function ensureSheet(spreadsheetId: string, sheetName: string) {
  const meta = await fetch(`${GATEWAY}/spreadsheets/${spreadsheetId}`, { headers: authHeaders() });
  if (!meta.ok) throw new Error(`Sheets metadata [${meta.status}]: ${await meta.text()}`);
  const j = await meta.json();
  const exists = (j.sheets || []).some((s: any) => s.properties?.title === sheetName);
  if (!exists) {
    const r = await fetch(`${GATEWAY}/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetName } } }] }),
    });
    if (!r.ok) throw new Error(`Add sheet [${r.status}]: ${await r.text()}`);
  }
  // Ensure header row
  const range = `${sheetName}!A1:J1`;
  await fetch(`${GATEWAY}/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ values: [HEADERS] }),
  });
}

async function writeAllRows(spreadsheetId: string, sheetName: string, rows: string[][]) {
  // Clear data rows then write
  const clearRange = `${sheetName}!A2:J100000`;
  await fetch(`${GATEWAY}/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
    method: "POST",
    headers: authHeaders(),
    body: "{}",
  });
  if (!rows.length) return;
  const range = `${sheetName}!A2`;
  const r = await fetch(`${GATEWAY}/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ values: rows }),
  });
  if (!r.ok) throw new Error(`Sheets write [${r.status}]: ${await r.text()}`);
}

function lancToRow(l: Lanc): string[] {
  return [
    l.sync_external_id || l.id,
    l.data || "",
    l.tipo || "",
    l.categoria || "",
    l.descricao || "",
    String(l.valor ?? 0),
    l.conta || "caixa",
    l.status || "realizado",
    l.data_pagamento || "",
    l.updated_at || "",
  ];
}

function parseNum(v: string): number {
  if (!v) return 0;
  const s = String(v).replace(/\s/g, "").replace("R$", "");
  // accept "1.234,56" or "1234.56"
  if (s.includes(",") && s.includes(".")) return parseFloat(s.replace(/\./g, "").replace(",", "."));
  if (s.includes(",")) return parseFloat(s.replace(",", "."));
  return parseFloat(s) || 0;
}

function parseDate(v: string): string | null {
  if (!v) return null;
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

export const syncSheets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { spreadsheetUrl: string; mode: "pull" | "push" | "both"; sheetName?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const spreadsheetId = extractSpreadsheetId(data.spreadsheetUrl);
    const sheetName = data.sheetName || "Lancamentos";

    await ensureSheet(spreadsheetId, sheetName);

    let created = 0;
    let updatedInApp = 0;
    let pushedToSheet = 0;
    const errors: string[] = [];

    // PULL: read sheet rows and upsert into lancamentos
    if (data.mode === "pull" || data.mode === "both") {
      const values = (await readSheet(spreadsheetId, sheetName)) || [];
      const dataRows = values.slice(1); // skip header
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const [sync_id, dt, tipo, categoria, descricao, valor, conta, status, data_pagamento, _u] = row;
        if (!dt && !descricao && !valor) continue; // empty row
        const dataIso = parseDate(dt || "");
        if (!dataIso) { errors.push(`Linha ${i + 2}: data inválida`); continue; }
        if (tipo !== "entrada" && tipo !== "saida") { errors.push(`Linha ${i + 2}: tipo inválido`); continue; }
        const payload: any = {
          data: dataIso,
          tipo,
          categoria: categoria || "Outros",
          descricao: descricao || "(sem descrição)",
          valor: parseNum(valor || "0"),
          conta: (conta as any) || "caixa",
          status: (status as any) || "realizado",
          data_pagamento: parseDate(data_pagamento || "") || null,
        };
        if (sync_id) {
          const { data: existing } = await supabase.from("lancamentos").select("id").eq("sync_external_id", sync_id).maybeSingle();
          if (existing) {
            const { error } = await supabase.from("lancamentos").update(payload).eq("id", existing.id);
            if (error) errors.push(`Linha ${i + 2}: ${error.message}`); else updatedInApp++;
          } else {
            const { error } = await supabase.from("lancamentos").insert({ ...payload, sync_external_id: sync_id });
            if (error) errors.push(`Linha ${i + 2}: ${error.message}`); else created++;
          }
        } else {
          const newSyncId = `s_${Date.now()}_${i}`;
          const { error } = await supabase.from("lancamentos").insert({ ...payload, sync_external_id: newSyncId });
          if (error) errors.push(`Linha ${i + 2}: ${error.message}`); else created++;
        }
      }
    }

    // PUSH: dump all lancamentos to sheet
    if (data.mode === "push" || data.mode === "both") {
      const { data: all, error } = await supabase
        .from("lancamentos")
        .select("id,data,tipo,categoria,descricao,valor,conta,status,data_pagamento,updated_at,sync_external_id")
        .order("data", { ascending: false })
        .limit(10000);
      if (error) throw new Error(error.message);
      // Ensure each row has a sync_external_id
      const list = (all as Lanc[]) || [];
      const toBackfill = list.filter((l) => !l.sync_external_id);
      for (const l of toBackfill) {
        const sid = `s_${l.id}`;
        await supabase.from("lancamentos").update({ sync_external_id: sid }).eq("id", l.id);
        l.sync_external_id = sid;
      }
      const rows = list.map(lancToRow);
      await writeAllRows(spreadsheetId, sheetName, rows);
      pushedToSheet = rows.length;
    }

    const summary = { created, updatedInApp, pushedToSheet, errors, at: new Date().toISOString() };

    await supabase
      .from("sheets_config")
      .upsert({ user_id: userId, spreadsheet_id: spreadsheetId, sheet_name: sheetName, last_sync_at: new Date().toISOString(), last_sync_summary: summary }, { onConflict: "user_id" });

    return summary;
  });

export const getSheetsConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("sheets_config").select("*").eq("user_id", userId).maybeSingle();
    return data;
  });
