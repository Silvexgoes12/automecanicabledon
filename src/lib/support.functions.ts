import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL_FALLBACK = "financeiro@plinenergia.com.br";

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("is_app_admin", { _uid: userId });
  return Boolean(data);
}

export const getSupportContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await isAdmin(context.supabase, context.userId);
    return { isAdmin: admin, userId: context.userId };
  });

export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const admin = await isAdmin(supabase, context.userId);
    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("id, user_id, tipo, assunto, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    let authors: Record<string, string> = {};
    if (admin && tickets && tickets.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ids = Array.from(new Set(tickets.map((t: any) => t.user_id)));
      for (const id of ids) {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        if (data?.user?.email) authors[id] = data.user.email;
      }
    }
    return { isAdmin: admin, tickets: tickets || [], authors };
  });

export const getTicketMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ticketId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msgs, error } = await supabase
      .from("support_messages")
      .select("id, ticket_id, user_id, is_admin, mensagem, created_at")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return msgs || [];
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tipo: "duvida" | "feedback"; assunto: string; mensagem: string }) => {
    if (!input.assunto?.trim()) throw new Error("Assunto obrigatório");
    if (!input.mensagem?.trim()) throw new Error("Mensagem obrigatória");
    if (input.tipo !== "duvida" && input.tipo !== "feedback") throw new Error("Tipo inválido");
    return {
      tipo: input.tipo,
      assunto: input.assunto.trim().slice(0, 200),
      mensagem: input.mensagem.trim().slice(0, 4000),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);

    const { data: ticket, error: tErr } = await supabase
      .from("support_tickets")
      .insert({ user_id: userId, tipo: data.tipo, assunto: data.assunto, status: "aberto" })
      .select()
      .single();
    if (tErr) throw new Error(tErr.message);

    const { error: mErr } = await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      user_id: userId,
      is_admin: admin,
      mensagem: data.mensagem,
    });
    if (mErr) throw new Error(mErr.message);

    // Notify admin
    try {
      const { sendEmail } = await import("@/lib/email.server");
      await sendEmail({
        to: ADMIN_EMAIL_FALLBACK,
        subject: `[Suporte] Novo ${data.tipo}: ${data.assunto}`,
        html: `<p><b>Tipo:</b> ${data.tipo}</p><p><b>Assunto:</b> ${escapeHtml(data.assunto)}</p><p>${escapeHtml(data.mensagem).replace(/\n/g, "<br>")}</p>`,
      });
    } catch {}

    return ticket;
  });

export const addMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ticketId: string; mensagem: string }) => {
    if (!input.ticketId) throw new Error("ticketId obrigatório");
    if (!input.mensagem?.trim()) throw new Error("Mensagem obrigatória");
    return { ticketId: input.ticketId, mensagem: input.mensagem.trim().slice(0, 4000) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);

    const { data: ticket, error: tErr } = await supabase
      .from("support_tickets")
      .select("id, user_id, tipo, status, assunto")
      .eq("id", data.ticketId)
      .single();
    if (tErr) throw new Error(tErr.message);

    const { error: mErr } = await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      user_id: userId,
      is_admin: admin,
      mensagem: data.mensagem,
    });
    if (mErr) throw new Error(mErr.message);

    const newStatus = admin ? "respondido" : "aberto";
    await supabase.from("support_tickets").update({ status: newStatus }).eq("id", ticket.id);

    // Notify the other party
    try {
      const { sendEmail } = await import("@/lib/email.server");
      if (admin) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(ticket.user_id);
        const to = u?.user?.email;
        if (to) {
          await sendEmail({
            to,
            subject: `[Suporte] Resposta: ${ticket.assunto}`,
            html: `<p>Você recebeu uma nova resposta no suporte:</p><blockquote>${escapeHtml(data.mensagem).replace(/\n/g, "<br>")}</blockquote>`,
          });
        }
      } else {
        await sendEmail({
          to: ADMIN_EMAIL_FALLBACK,
          subject: `[Suporte] Nova mensagem em: ${ticket.assunto}`,
          html: `<p>${escapeHtml(data.mensagem).replace(/\n/g, "<br>")}</p>`,
        });
      }
    } catch {}

    return { ok: true };
  });

export const setTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ticketId: string; status: "aberto" | "respondido" | "resolvido" }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);
    if (!admin) throw new Error("Apenas o admin pode alterar o status");
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: data.status })
      .eq("id", data.ticketId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
