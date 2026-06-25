import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtDate } from "@/lib/format";

type Ticket = {
  id: string;
  user_id: string;
  tipo: "duvida" | "feedback";
  assunto: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  ticket_id: string;
  user_id: string;
  is_admin: boolean;
  mensagem: string;
  created_at: string;
};

const statusLabel: Record<string, string> = {
  aberto: "Aberto",
  respondido: "Respondido",
  resolvido: "Resolvido",
};

function header(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Central de Suporte — Auto Mecânica Bledon", 14, 10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 17);
  if (subtitle) {
    doc.text(subtitle, doc.internal.pageSize.getWidth() - 14, 17, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);
}

function drawTicket(
  doc: jsPDF,
  ticket: Ticket,
  messages: Message[],
  author?: string,
  startY = 30,
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = startY;

  // Ticket box
  doc.setFillColor(241, 245, 249);
  doc.rect(10, y, pageWidth - 20, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(ticket.assunto.slice(0, 90), 14, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const tipo = ticket.tipo === "feedback" ? "Feedback" : "Dúvida";
  const meta = `${tipo} • Status: ${statusLabel[ticket.status] ?? ticket.status} • Criado: ${fmtDate(ticket.created_at)} • Atualizado: ${fmtDate(ticket.updated_at)}`;
  doc.text(meta, 14, y + 13);
  if (author) doc.text(`Autor: ${author}`, 14, y + 19);
  doc.setTextColor(0, 0, 0);
  y += 26;

  if (!messages.length) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("Sem mensagens neste ticket.", 14, y);
    doc.setTextColor(0, 0, 0);
    return y + 8;
  }

  autoTable(doc, {
    startY: y,
    head: [["Quando", "De", "Mensagem"]],
    body: messages.map((m) => [
      fmtDate(m.created_at),
      m.is_admin ? "Suporte" : "Usuário",
      m.mensagem,
    ]),
    styles: { fontSize: 9, cellPadding: 3, valign: "top" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 22 },
      2: { cellWidth: "auto" },
    },
    margin: { left: 10, right: 10 },
  });

  // @ts-ignore autoTable adds lastAutoTable
  return (doc as any).lastAutoTable.finalY + 8;
}

export function exportTicketPdf(
  ticket: Ticket,
  messages: Message[],
  author?: string,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, `Ticket: ${ticket.assunto}`, fmtDate(new Date().toISOString()));
  drawTicket(doc, ticket, messages, author);
  doc.save(`ticket-${ticket.assunto.replace(/[^\w]+/g, "_").slice(0, 40)}.pdf`);
}

export function exportTicketsPdf(
  title: string,
  items: { ticket: Ticket; messages: Message[]; author?: string }[],
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  header(doc, title, fmtDate(new Date().toISOString()));
  let y = 30;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (!items.length) {
    doc.setFontSize(11);
    doc.text("Nenhum ticket para exportar.", 14, y);
  }

  items.forEach((it, idx) => {
    if (y > pageHeight - 40) {
      doc.addPage();
      header(doc, title, fmtDate(new Date().toISOString()));
      y = 30;
    }
    y = drawTicket(doc, it.ticket, it.messages, it.author, y);
    if (idx < items.length - 1 && y > pageHeight - 40) {
      doc.addPage();
      header(doc, title, fmtDate(new Date().toISOString()));
      y = 30;
    }
  });

  doc.save(`suporte-${title.toLowerCase().replace(/[^\w]+/g, "_")}.pdf`);
}
