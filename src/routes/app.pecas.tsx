import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTable } from "@/components/PageTable";
import { Badge } from "@/components/ui/badge";
import { fmtBRL } from "@/lib/format";

export const Route = createFileRoute("/app/pecas")({
  component: Page,
  head: () => ({ meta: [{ title: "Peças & Estoque | Diesel Mecânica" }] }),
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("pecas").select("*, fornecedores(nome)").order("nome").then(({ data }) => {
      setRows(data || []); setLoading(false);
    });
  }, []);
  return (
    <PageTable
      title="Peças & Estoque"
      subtitle={`${rows.length} itens no catálogo`}
      rows={rows}
      loading={loading}
      searchKeys={["nome", "codigo", "categoria"]}
      cols={[
        { key: "codigo", label: "Código", render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
        { key: "nome", label: "Peça", render: (r) => <span className="font-medium">{r.nome}</span> },
        { key: "categoria", label: "Categoria", render: (r) => <Badge variant="secondary">{r.categoria}</Badge> },
        { key: "fornecedor", label: "Fornecedor", render: (r) => r.fornecedores?.nome || "-" },
        { key: "preco_custo", label: "Custo", render: (r) => fmtBRL(r.preco_custo) },
        { key: "preco_venda", label: "Venda", render: (r) => <span className="font-semibold">{fmtBRL(r.preco_venda)}</span> },
        { key: "estoque_atual", label: "Estoque", render: (r) => (
          <Badge variant={r.estoque_atual <= r.estoque_minimo ? "destructive" : "outline"}>{r.estoque_atual} {r.unidade}</Badge>
        )},
      ]}
    />
  );
}
