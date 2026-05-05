export const fmtBRL = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtNum = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("pt-BR");

export const fmtDate = (d: string | null | undefined) => {
  if (!d) return "-";
  const dt = new Date(d.includes("T") ? d : d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR");
};

export const statusColors: Record<string, string> = {
  aberta: "bg-warning/20 text-warning-foreground border-warning/40",
  em_andamento: "bg-chart-2/20 text-chart-2 border-chart-2/40",
  aguardando_peca: "bg-accent text-accent-foreground border-accent",
  concluida: "bg-success/20 text-success border-success/40",
  entregue: "bg-success/30 text-success border-success",
  cancelada: "bg-destructive/15 text-destructive border-destructive/40",
};

export const statusLabel: Record<string, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  aguardando_peca: "Aguardando peça",
  concluida: "Concluída",
  entregue: "Entregue",
  cancelada: "Cancelada",
};

export const estagioLabel: Record<string, string> = {
  novo: "Novo",
  contato_feito: "Contato feito",
  qualificado: "Qualificado",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const estagioOrder = ["novo","contato_feito","qualificado","proposta","negociacao","ganho","perdido"];
