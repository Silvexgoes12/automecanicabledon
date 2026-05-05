import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReactNode, useMemo, useState } from "react";

export interface Col<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  title: string;
  subtitle?: string;
  rows: T[];
  cols: Col<T>[];
  searchKeys?: string[];
  loading?: boolean;
  rightSlot?: ReactNode;
}

export function PageTable<T extends Record<string, any>>({ title, subtitle, rows, cols, searchKeys, loading, rightSlot }: Props<T>) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q || !searchKeys) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(s)));
  }, [rows, q, searchKeys]);

  return (
    <div className="p-8 space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {searchKeys && (
            <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          )}
          {rightSlot}
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className={`text-left font-semibold px-4 py-3 ${c.className || ""}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted-foreground">Nenhum registro</td></tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30">
                    {cols.map((c) => (
                      <td key={c.key} className={`px-4 py-3 ${c.className || ""}`}>
                        {c.render ? c.render(r) : String(r[c.key] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-xs text-muted-foreground border-t">{filtered.length} registro(s)</div>
      </Card>
    </div>
  );
}
