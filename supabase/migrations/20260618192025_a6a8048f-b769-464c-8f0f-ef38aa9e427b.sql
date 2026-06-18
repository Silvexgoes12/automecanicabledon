
-- Fix 1: app_admins SELECT only by admin
DROP POLICY IF EXISTS "admins readable by authenticated" ON public.app_admins;
CREATE POLICY "app_admins admin select" ON public.app_admins
  FOR SELECT TO authenticated USING (public.is_app_admin(auth.uid()));

-- Helper: replace all auth_all_* permissive policies on business tables with admin-only ones
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clientes','crm_interacoes','crm_leads','despesas','fornecedores',
    'funcionarios','lancamentos','ordens_servico','os_itens','pagamentos',
    'pecas','servicos_catalogo','veiculos'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_all_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS auth_all_delete ON public.%I', t);
    EXECUTE format('CREATE POLICY admin_select ON public.%I FOR SELECT TO authenticated USING (public.is_app_admin(auth.uid()))', t);
    EXECUTE format('CREATE POLICY admin_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_app_admin(auth.uid()))', t);
    EXECUTE format('CREATE POLICY admin_update ON public.%I FOR UPDATE TO authenticated USING (public.is_app_admin(auth.uid())) WITH CHECK (public.is_app_admin(auth.uid()))', t);
    EXECUTE format('CREATE POLICY admin_delete ON public.%I FOR DELETE TO authenticated USING (public.is_app_admin(auth.uid()))', t);
  END LOOP;
END $$;

-- Fix function search_path mutable on tg_set_updated_at
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Revoke EXECUTE on trigger function from anon/authenticated (only used internally by triggers)
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
