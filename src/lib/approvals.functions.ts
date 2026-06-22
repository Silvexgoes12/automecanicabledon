import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("is_app_admin", { _uid: userId });
  return Boolean(data);
}

export const getMyApprovalStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);
    if (admin) return { status: "aprovado" as const, isAdmin: true };

    const { data, error } = await supabase
      .from("user_approvals")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    // Defensive: if no row exists (e.g. trigger missed), treat as pending.
    return {
      status: (data?.status as "pendente" | "aprovado" | "rejeitado") || "pendente",
      isAdmin: false,
    };
  });

export const listApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);
    if (!admin) throw new Error("Acesso restrito ao administrador");

    const { data, error } = await supabase
      .from("user_approvals")
      .select("user_id, email, status, requested_at, decided_at")
      .order("requested_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data || [];
  });

export const setApprovalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; status: "aprovado" | "rejeitado" | "pendente" }) => {
    if (!input.userId) throw new Error("userId obrigatório");
    if (!["aprovado", "rejeitado", "pendente"].includes(input.status)) {
      throw new Error("Status inválido");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);
    if (!admin) throw new Error("Apenas o administrador pode aprovar usuários");

    const { error } = await supabase
      .from("user_approvals")
      .update({
        status: data.status,
        decided_at: new Date().toISOString(),
        decided_by: userId,
      })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
