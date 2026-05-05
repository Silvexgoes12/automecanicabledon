
-- Enums
CREATE TYPE tipo_cliente AS ENUM ('PF','PJ');
CREATE TYPE tipo_veiculo AS ENUM ('caminhao','onibus','van','picape','maquinario','trator','outro');
CREATE TYPE status_os AS ENUM ('aberta','em_andamento','aguardando_peca','concluida','cancelada','entregue');
CREATE TYPE forma_pagamento AS ENUM ('dinheiro','pix','cartao_debito','cartao_credito','boleto','transferencia');
CREATE TYPE categoria_despesa AS ENUM ('folha_pagamento','encargos_sociais','aluguel','energia','agua','internet','telefone','impostos','compra_pecas','compra_lubrificantes','ferramentas','epi','marketing','manutencao_predial','treinamento','contabilidade','seguros','combustivel_frota','material_escritorio','software','descarte_residuos','outros');
CREATE TYPE estagio_funil AS ENUM ('novo','contato_feito','qualificado','proposta','negociacao','ganho','perdido');
CREATE TYPE tipo_interacao AS ENUM ('ligacao','whatsapp','email','visita','reuniao','orcamento');

-- Tabelas
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_cliente NOT NULL DEFAULT 'PF',
  nome TEXT NOT NULL,
  documento TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  origem TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano INT,
  motor TEXT,
  tipo tipo_veiculo NOT NULL DEFAULT 'caminhao',
  km_atual INT,
  cor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  salario NUMERIC(10,2) NOT NULL,
  data_admissao DATE NOT NULL,
  data_demissao DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  cpf TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  categoria TEXT NOT NULL,
  contato TEXT,
  telefone TEXT,
  email TEXT,
  cidade TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  preco_custo NUMERIC(10,2) NOT NULL,
  preco_venda NUMERIC(10,2) NOT NULL,
  estoque_atual INT NOT NULL DEFAULT 0,
  estoque_minimo INT NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'un',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.servicos_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  preco_base NUMERIC(10,2) NOT NULL,
  tempo_estimado_horas NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT UNIQUE NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id),
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id),
  mecanico_id UUID REFERENCES public.funcionarios(id),
  status status_os NOT NULL DEFAULT 'aberta',
  km_entrada INT,
  descricao_problema TEXT,
  diagnostico TEXT,
  data_abertura DATE NOT NULL,
  data_conclusao DATE,
  data_entrega DATE,
  valor_pecas NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_servicos NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_pecas NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.os_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('peca','servico')),
  peca_id UUID REFERENCES public.pecas(id),
  servico_id UUID REFERENCES public.servicos_catalogo(id),
  descricao TEXT NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL,
  custo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  categoria categoria_despesa NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  funcionario_id UUID REFERENCES public.funcionarios(id),
  forma_pagamento forma_pagamento,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  forma forma_pagamento NOT NULL,
  parcelas INT NOT NULL DEFAULT 1,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  empresa TEXT,
  telefone TEXT,
  email TEXT,
  origem TEXT,
  estagio estagio_funil NOT NULL DEFAULT 'novo',
  valor_estimado NUMERIC(10,2),
  responsavel_id UUID REFERENCES public.funcionarios(id),
  cliente_id UUID REFERENCES public.clientes(id),
  data_criacao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fechamento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  funcionario_id UUID REFERENCES public.funcionarios(id),
  data TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo tipo_interacao NOT NULL,
  assunto TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_veiculos_cliente ON public.veiculos(cliente_id);
CREATE INDEX idx_os_cliente ON public.ordens_servico(cliente_id);
CREATE INDEX idx_os_veiculo ON public.ordens_servico(veiculo_id);
CREATE INDEX idx_os_data ON public.ordens_servico(data_abertura);
CREATE INDEX idx_os_itens_os ON public.os_itens(os_id);
CREATE INDEX idx_despesas_data ON public.despesas(data);
CREATE INDEX idx_despesas_categoria ON public.despesas(categoria);
CREATE INDEX idx_pagamentos_os ON public.pagamentos(os_id);

-- RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interacoes ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users full access (demo/analytics shared base)
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['clientes','veiculos','funcionarios','fornecedores','pecas','servicos_catalogo','ordens_servico','os_itens','despesas','pagamentos','crm_leads','crm_interacoes'])
  LOOP
    EXECUTE format('CREATE POLICY "auth_all_select" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "auth_all_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "auth_all_update" ON public.%I FOR UPDATE TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "auth_all_delete" ON public.%I FOR DELETE TO authenticated USING (true)', t);
  END LOOP;
END $$;
