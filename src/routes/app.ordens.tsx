import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTable } from "@/components/PageTable";
import { Badge } from "@/components/ui/badge";
import { fmtBRL, fmtDate, statusColors, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/app/ordens")({
  component: Page,
  head: () => ({ meta: [{ title: "Ordens de Serviço | Diesel Mecânica" }] }),
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      // load most recent 1000
      const { data } = await supabase
        .from("ordens_servico")
        .select("*, clientes(nome), veiculos(placa,marca,modelo), funcionarios(nome)")
        .order("data_abertura", { ascending: false })
        .limit(1000);
      setRows(data || []); setLoading(false);
    })();
  }, []);
  return (
    <PageTable
      title="Ordens de Serviço"
      subtitle={`Mostrando as ${rows.length} OS mais recentes`}
      rows={rows}
      loading={loading}
      searchKeys={["numero", "descricao_problema"]}
      cols={[
        { key: "numero", label: "Nº OS", render: (r) => <span className="font-mono text-xs font-semibold">{r.numero}</span> },
        { key: "data_abertura", label: "Abertura", render: (r) => fmtDate(r.data_abertura) },
        { key: "cliente", label: "Cliente", render: (r) => r.clientes?.nome || "-" },
        { key: "veiculo", label: "Veículo", render: (r) => r.veiculos ? `${r.veiculos.placa} • ${r.veiculos.marca}` : "-" },
        { key: "mec", label: "Mecânico", render: (r) => r.funcionarios?.nome || "-" },
        { key: "status", label: "Status", render: (r) => <Badge className={statusColors[r.status]} variant="outline">{statusLabel[r.status] || r.status}</Badge> },
        { key: "valor_total", label: "Total", render: (r) => <span className="font-semibold">{fmtBRL(r.valor_total)}</span> },
      ]}
    />
  );
}
