
CREATE TYPE lancamento_tipo AS ENUM ('entrada','saida');
CREATE TYPE lancamento_status AS ENUM ('previsto','realizado');
CREATE TYPE lancamento_conta AS ENUM ('caixa','banco','cartao');

CREATE TABLE public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  tipo lancamento_tipo NOT NULL,
  categoria text NOT NULL,
  subcategoria text,
  descricao text NOT NULL,
  valor numeric NOT NULL,
  forma_pagamento text,
  status lancamento_status NOT NULL DEFAULT 'realizado',
  conta lancamento_conta NOT NULL DEFAULT 'caixa',
  data_vencimento date,
  data_pagamento date,
  os_id uuid,
  cliente_fornecedor text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY auth_all_select ON public.lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY auth_all_insert ON public.lancamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY auth_all_update ON public.lancamentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY auth_all_delete ON public.lancamentos FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_lancamentos_data ON public.lancamentos(data);
CREATE INDEX idx_lancamentos_status ON public.lancamentos(status);
