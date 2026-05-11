import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageTable } from "@/components/PageTable";
import { fmtNum } from "@/lib/format";

export const Route = createFileRoute("/app/veiculos")({
  component: Page,
  head: () => ({ meta: [{ title: "Veículos | Diesel Mecânica" }] }),
});

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("veiculos").select("*, clientes(nome)").order("placa").limit(1000);
      setRows(data || []); setLoading(false);
    })();
  }, []);
  return (
    <PageTable
      title="Veículos"
      subtitle={`Frota cadastrada — ${rows.length} veículos`}
      rows={rows}
      loading={loading}
      searchKeys={["placa", "marca", "modelo"]}
      cols={[
        { key: "placa", label: "Placa", render: (r) => <span className="font-mono font-semibold">{r.placa}</span> },
        { key: "marca", label: "Marca/Modelo", render: (r) => `${r.marca} ${r.modelo}` },
        { key: "ano", label: "Ano" },
        { key: "tipo", label: "Tipo" },
        { key: "motor", label: "Motor" },
        { key: "km_atual", label: "Km", render: (r) => fmtNum(r.km_atual) },
        { key: "cliente", label: "Cliente", render: (r) => r.clientes?.nome || "-" },
      ]}
    />
  );
}
