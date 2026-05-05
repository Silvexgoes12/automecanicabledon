import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTable } from "@/components/PageTable";
import { Badge } from "@/components/ui/badge";
import { fmtBRL, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/app/despesas")({
  component: Page,
  head: () => ({ meta: [{ title: "Despesas | Diesel Mecânica" }] }),
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("despesas")
        .select("*, fornecedores(nome), funcionarios(nome)")
        .order("data", { ascending: false })
        .limit(1000);
      setRows(data || []); setLoading(false);
    })();
  }, []);
  const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
  return (
    <PageTable
      title="Despesas"
      subtitle={`Total exibido: ${fmtBRL(total)}`}
      rows={rows}
      loading={loading}
      searchKeys={["descricao", "categoria"]}
      cols={[
        { key: "data", label: "Data", render: (r) => fmtDate(r.data) },
        { key: "categoria", label: "Categoria", render: (r) => <Badge variant="secondary">{r.categoria}</Badge> },
        { key: "descricao", label: "Descrição" },
        { key: "fornecedor", label: "Fornecedor", render: (r) => r.fornecedores?.nome || r.funcionarios?.nome || "-" },
        { key: "forma_pagamento", label: "Pagamento" },
        { key: "valor", label: "Valor", render: (r) => <span className="font-semibold text-destructive">{fmtBRL(r.valor)}</span> },
      ]}
    />
  );
}
