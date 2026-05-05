import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTable } from "@/components/PageTable";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/app/clientes")({
  component: ClientesPage,
  head: () => ({ meta: [{ title: "Clientes | Diesel Mecânica" }] }),
});

function ClientesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("clientes").select("*").order("nome").limit(1000).then(({ data }) => {
      setRows(data || []); setLoading(false);
    });
  }, []);
  return (
    <PageTable
      title="Clientes"
      subtitle={`${rows.length} clientes cadastrados`}
      rows={rows}
      loading={loading}
      searchKeys={["nome", "documento", "cidade", "email"]}
      cols={[
        { key: "nome", label: "Nome", render: (r) => <span className="font-medium">{r.nome}</span> },
        { key: "tipo", label: "Tipo", render: (r) => <Badge variant={r.tipo === "PJ" ? "default" : "secondary"}>{r.tipo}</Badge> },
        { key: "documento", label: "Documento" },
        { key: "telefone", label: "Telefone" },
        { key: "cidade", label: "Cidade", render: (r) => `${r.cidade || "-"}/${r.estado || ""}` },
        { key: "origem", label: "Origem" },
      ]}
    />
  );
}
