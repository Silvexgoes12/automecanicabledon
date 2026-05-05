import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTable } from "@/components/PageTable";
import { fmtBRL, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/app/equipe")({
  component: Page,
  head: () => ({ meta: [{ title: "Equipe | Diesel Mecânica" }] }),
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("funcionarios").select("*").order("nome").then(({ data }) => {
      setRows(data || []); setLoading(false);
    });
  }, []);
  return (
    <PageTable
      title="Equipe"
      subtitle={`${rows.length} colaboradores`}
      rows={rows}
      loading={loading}
      searchKeys={["nome", "cargo"]}
      cols={[
        { key: "nome", label: "Nome", render: (r) => <span className="font-medium">{r.nome}</span> },
        { key: "cargo", label: "Cargo" },
        { key: "salario", label: "Salário", render: (r) => fmtBRL(r.salario) },
        { key: "data_admissao", label: "Admissão", render: (r) => fmtDate(r.data_admissao) },
        { key: "telefone", label: "Telefone" },
      ]}
    />
  );
}
