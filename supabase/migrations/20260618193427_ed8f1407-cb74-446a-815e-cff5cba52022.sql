
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clientes','veiculos','ordens_servico','os_itens',
    'pecas','servicos_catalogo','fornecedores','funcionarios',
    'despesas','lancamentos','pagamentos',
    'crm_leads','crm_interacoes'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS admin_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS admin_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS admin_delete ON public.%I', t);

    EXECUTE format('CREATE POLICY auth_all_select ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY auth_all_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY auth_all_update ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY auth_all_delete ON public.%I FOR DELETE TO authenticated USING (true)', t);
  END LOOP;
END $$;
