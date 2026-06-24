
CREATE OR REPLACE FUNCTION public.gerar_dados_mes(p_ano int, p_mes int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_mes_ini date := make_date(p_ano, p_mes, 1);
  v_mes_fim date := (make_date(p_ano, p_mes, 1) + interval '1 month' - interval '1 day')::date;
  v_dias int := extract(day from v_mes_fim);
  v_qtd_os int;
  v_ticket_medio numeric;
  v_seq bigint;
  v_i int; v_j int;
  v_os_id uuid;
  v_cliente_id uuid; v_veiculo_id uuid; v_mecanico_id uuid;
  v_data_abertura date; v_data_conclusao date;
  v_status text;
  v_n_itens int;
  v_peca record; v_serv record;
  v_qtd numeric; v_preco numeric; v_custo numeric;
  v_total_servicos numeric; v_total_pecas numeric; v_total_custo numeric; v_total numeric;
  v_lead_id uuid; v_n_inter int; v_forma text;
  v_estagios text[] := ARRAY['novo','contato_feito','qualificado','proposta','negociacao','ganho','perdido'];
  v_origens text[]  := ARRAY['Google','Instagram','Facebook','WhatsApp','Indicação','Site','Cliente Antigo'];
  v_inter_tipos text[] := ARRAY['ligacao','whatsapp','email','visita','orcamento','reuniao'];
  v_pag_formas text[] := ARRAY['pix','cartao_credito','cartao_debito','dinheiro','transferencia','boleto'];
BEGIN
  IF EXISTS (SELECT 1 FROM ordens_servico WHERE data_abertura >= v_mes_ini AND data_abertura <= v_mes_fim) THEN
    RAISE NOTICE 'Mês %-% já contém dados, pulando.', p_ano, p_mes;
    RETURN;
  END IF;

  PERFORM setseed(((p_ano * 100 + p_mes) % 997) / 1000.0);

  SELECT
    COALESCE(ROUND(AVG(c) * 1.05)::int, 25),
    COALESCE(AVG(tm) * 1.12, 2800)
  INTO v_qtd_os, v_ticket_medio
  FROM (
    SELECT count(*)::numeric c, (sum(valor_total)/NULLIF(count(*),0))::numeric tm
    FROM ordens_servico
    WHERE extract(month from data_abertura) = p_mes
      AND extract(year  from data_abertura) < p_ano
      AND status <> 'cancelada'
    GROUP BY extract(year from data_abertura)
  ) h;

  IF v_qtd_os < 5 THEN v_qtd_os := 25; END IF;

  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(split_part(numero, '-', 3), '\D', '', 'g'), '')::bigint
  ), 0) + 1
  INTO v_seq
  FROM ordens_servico
  WHERE numero LIKE 'OS-' || p_ano || '-%';

  FOR v_i IN 1..v_qtd_os LOOP
    SELECT id INTO v_cliente_id FROM clientes ORDER BY random() LIMIT 1;
    SELECT id INTO v_veiculo_id FROM veiculos WHERE cliente_id = v_cliente_id ORDER BY random() LIMIT 1;
    IF v_veiculo_id IS NULL THEN
      SELECT id INTO v_veiculo_id FROM veiculos ORDER BY random() LIMIT 1;
    END IF;
    SELECT id INTO v_mecanico_id FROM funcionarios
      WHERE ativo AND cargo ILIKE '%ecânico%' ORDER BY random() LIMIT 1;

    v_data_abertura := v_mes_ini + ((floor(random() * v_dias))::int);
    IF v_data_abertura > v_mes_fim THEN v_data_abertura := v_mes_fim; END IF;

    IF random() < 0.85 THEN v_status := 'concluida';
    ELSIF random() < 0.7 THEN v_status := 'entregue';
    ELSE v_status := 'em_andamento';
    END IF;

    v_data_conclusao := CASE WHEN v_status IN ('concluida','entregue')
      THEN LEAST(v_data_abertura + (1 + floor(random()*5))::int, v_mes_fim)
      ELSE NULL END;

    v_os_id := gen_random_uuid();

    INSERT INTO ordens_servico (
      id, numero, cliente_id, veiculo_id, mecanico_id, status,
      data_abertura, data_conclusao, data_entrega,
      km_entrada, descricao_problema,
      valor_pecas, valor_servicos, valor_desconto, valor_total, custo_pecas
    ) VALUES (
      v_os_id,
      'OS-' || p_ano || '-' || lpad(v_seq::text, 5, '0'),
      v_cliente_id, v_veiculo_id, v_mecanico_id, v_status::status_os,
      v_data_abertura, v_data_conclusao,
      CASE WHEN v_status = 'entregue' THEN v_data_conclusao ELSE NULL END,
      (50000 + floor(random()*250000))::int,
      (ARRAY['Revisão preventiva','Troca de óleo e filtros','Barulho no motor',
        'Vazamento de óleo','Manutenção do sistema de freios','Suspensão fazendo ruído',
        'Diagnóstico eletrônico','Troca de embreagem','Alinhamento e balanceamento',
        'Revisão do sistema de arrefecimento'])[1 + floor(random()*10)::int],
      0, 0, 0, 0, 0
    );
    v_seq := v_seq + 1;

    v_n_itens := 2 + floor(random()*5)::int;
    v_total_servicos := 0; v_total_pecas := 0; v_total_custo := 0;

    FOR v_j IN 1..v_n_itens LOOP
      IF random() < 0.55 THEN
        SELECT id, nome, preco_venda, preco_custo INTO v_peca FROM pecas ORDER BY random() LIMIT 1;
        v_qtd := 1 + floor(random()*3);
        v_preco := COALESCE(v_peca.preco_venda, 150) * (0.9 + random()*0.3);
        v_custo := COALESCE(v_peca.preco_custo, v_preco*0.6);
        INSERT INTO os_itens(os_id, tipo, peca_id, descricao, quantidade, preco_unitario, custo_unitario, subtotal)
        VALUES (v_os_id, 'peca', v_peca.id, v_peca.nome, v_qtd,
                round(v_preco::numeric,2), round(v_custo::numeric,2),
                round((v_qtd * v_preco)::numeric,2));
        v_total_pecas := v_total_pecas + v_qtd * v_preco;
        v_total_custo := v_total_custo + v_qtd * v_custo;
      ELSE
        SELECT id, nome, preco_base INTO v_serv FROM servicos_catalogo ORDER BY random() LIMIT 1;
        v_qtd := 1;
        v_preco := COALESCE(v_serv.preco_base, 250) * (0.9 + random()*0.35);
        INSERT INTO os_itens(os_id, tipo, servico_id, descricao, quantidade, preco_unitario, custo_unitario, subtotal)
        VALUES (v_os_id, 'servico', v_serv.id, v_serv.nome, v_qtd,
                round(v_preco::numeric,2), 0, round(v_preco::numeric,2));
        v_total_servicos := v_total_servicos + v_preco;
      END IF;
    END LOOP;

    v_total := v_total_pecas + v_total_servicos;
    IF v_total > 0 THEN
      DECLARE v_alvo numeric := v_ticket_medio * (0.6 + random()*0.9);
              v_fator numeric;
      BEGIN
        v_fator := v_alvo / v_total;
        v_total_pecas := round((v_total_pecas * v_fator)::numeric, 2);
        v_total_servicos := round((v_total_servicos * v_fator)::numeric, 2);
        v_total_custo := round((v_total_custo * v_fator)::numeric, 2);
        v_total := v_total_pecas + v_total_servicos;
        UPDATE os_itens
          SET preco_unitario = round((preco_unitario * v_fator)::numeric, 2),
              subtotal       = round((subtotal       * v_fator)::numeric, 2),
              custo_unitario = round((custo_unitario * v_fator)::numeric, 2)
        WHERE os_id = v_os_id;
      END;
    END IF;

    UPDATE ordens_servico
       SET valor_pecas = v_total_pecas, valor_servicos = v_total_servicos,
           valor_total = v_total, custo_pecas = v_total_custo
     WHERE id = v_os_id;

    IF v_status IN ('concluida','entregue') AND v_total > 0 THEN
      v_forma := v_pag_formas[1 + floor(random()*array_length(v_pag_formas,1))::int];
      INSERT INTO pagamentos(os_id, data, valor, forma, parcelas)
      VALUES (v_os_id, v_data_conclusao, v_total, v_forma::forma_pagamento,
              CASE WHEN random() < 0.2 THEN 2 + floor(random()*3)::int ELSE 1 END);

      INSERT INTO lancamentos(data, tipo, categoria, descricao, valor, forma_pagamento,
                              status, conta, data_pagamento, os_id, cliente_fornecedor)
      SELECT v_data_conclusao, 'entrada'::lancamento_tipo, 'Serviços',
             'Recebimento OS ' || os.numero, v_total, 'pix',
             'realizado'::lancamento_status, 'banco'::lancamento_conta,
             v_data_conclusao, v_os_id, cli.nome
      FROM ordens_servico os JOIN clientes cli ON cli.id = os.cliente_id
      WHERE os.id = v_os_id;
    END IF;
  END LOOP;

  INSERT INTO despesas(data, categoria, descricao, valor, forma_pagamento, recorrente)
  VALUES
    (v_mes_ini + 4, 'folha_pagamento'::categoria_despesa, 'Folha de pagamento - funcionários',
       round((28000 * (1 + (p_ano - 2024) * 0.08))::numeric, 2), 'transferencia'::forma_pagamento, true),
    (v_mes_ini + 9, 'encargos_sociais'::categoria_despesa, 'INSS, FGTS e encargos',
       round((8500 * (1 + (p_ano - 2024) * 0.08))::numeric, 2), 'boleto'::forma_pagamento, true),
    (v_mes_ini + 4, 'aluguel'::categoria_despesa, 'Aluguel da oficina',
       round((6500 * (1 + (p_ano - 2024) * 0.07))::numeric, 2), 'transferencia'::forma_pagamento, true),
    (v_mes_ini + 14, 'energia'::categoria_despesa, 'Conta de energia elétrica',
       round((1800 * (1 + random()*0.3))::numeric, 2), 'boleto'::forma_pagamento, true),
    (v_mes_ini + 11, 'agua'::categoria_despesa, 'Conta de água',
       round((420 * (1 + random()*0.25))::numeric, 2), 'boleto'::forma_pagamento, true),
    (v_mes_ini + 7, 'internet'::categoria_despesa, 'Internet e telefonia',
       round((520 * (1 + random()*0.15))::numeric, 2), 'boleto'::forma_pagamento, true),
    (v_mes_ini + 19, 'contabilidade'::categoria_despesa, 'Honorários contábeis',
       round((1450 * (1 + (p_ano - 2024) * 0.06))::numeric, 2), 'pix'::forma_pagamento, true),
    (v_mes_ini + 17, 'impostos'::categoria_despesa, 'Impostos do mês (Simples Nacional)',
       round((4800 * (1 + (p_ano - 2024) * 0.1) * (0.85 + random()*0.3))::numeric, 2),
       'boleto'::forma_pagamento, true),
    (v_mes_ini + 24, 'seguros'::categoria_despesa, 'Seguro empresarial',
       round((780 * (1 + (p_ano - 2024) * 0.05))::numeric, 2), 'cartao_credito'::forma_pagamento, true);

  INSERT INTO despesas(data, categoria, descricao, valor, forma_pagamento, recorrente)
  VALUES
    (v_mes_ini + 5, 'compra_pecas'::categoria_despesa, 'Reposição de estoque - peças',
       round((v_qtd_os * 850 * (0.8 + random()*0.4))::numeric, 2), 'boleto'::forma_pagamento, false),
    (v_mes_ini + 18, 'compra_pecas'::categoria_despesa, 'Compra de peças - fornecedor',
       round((v_qtd_os * 420 * (0.7 + random()*0.6))::numeric, 2), 'boleto'::forma_pagamento, false),
    (v_mes_ini + 10, 'compra_lubrificantes'::categoria_despesa, 'Óleos e lubrificantes',
       round((v_qtd_os * 110 * (0.8 + random()*0.4))::numeric, 2), 'pix'::forma_pagamento, false),
    (v_mes_ini + 12, 'marketing'::categoria_despesa, 'Anúncios Google / Instagram',
       round((650 * (0.7 + random()*0.6))::numeric, 2), 'cartao_credito'::forma_pagamento, false),
    (v_mes_ini + 22, 'manutencao_predial'::categoria_despesa, 'Manutenção predial',
       round((350 * (0.4 + random()*1.2))::numeric, 2), 'pix'::forma_pagamento, false),
    (v_mes_ini + 8, 'epi'::categoria_despesa, 'EPIs e uniformes',
       round((280 * (0.4 + random()*1.0))::numeric, 2), 'pix'::forma_pagamento, false),
    (v_mes_ini + 6, 'material_escritorio'::categoria_despesa, 'Material de escritório',
       round((180 * (0.5 + random()*1.0))::numeric, 2), 'cartao_credito'::forma_pagamento, false);

  INSERT INTO lancamentos(data, tipo, categoria, descricao, valor, forma_pagamento,
                          status, conta, data_pagamento, cliente_fornecedor)
  SELECT d.data, 'saida'::lancamento_tipo,
         CASE d.categoria::text
           WHEN 'folha_pagamento' THEN 'Folha de Pagamento'
           WHEN 'encargos_sociais' THEN 'Encargos Sociais'
           WHEN 'aluguel' THEN 'Aluguel'
           WHEN 'energia' THEN 'Energia'
           WHEN 'agua' THEN 'Água'
           WHEN 'internet' THEN 'Internet'
           WHEN 'contabilidade' THEN 'Contabilidade'
           WHEN 'impostos' THEN 'Impostos'
           WHEN 'compra_pecas' THEN 'Compra de Peças'
           WHEN 'marketing' THEN 'Marketing'
           WHEN 'epi' THEN 'EPI'
           ELSE 'Outros'
         END,
         d.descricao, d.valor, d.forma_pagamento::text, 'realizado'::lancamento_status,
         'banco'::lancamento_conta, d.data, NULL
  FROM despesas d
  WHERE d.data >= v_mes_ini AND d.data <= v_mes_fim
    AND NOT EXISTS (
      SELECT 1 FROM lancamentos l
      WHERE l.tipo = 'saida' AND l.data = d.data AND l.descricao = d.descricao
    );

  FOR v_i IN 1..(5 + floor(random()*4)::int) LOOP
    v_lead_id := gen_random_uuid();
    INSERT INTO crm_leads(id, nome, empresa, telefone, email, origem, estagio,
                          valor_estimado, data_criacao, observacoes)
    VALUES (
      v_lead_id,
      (ARRAY['Carlos','Ana','Marcelo','Fernanda','Roberto','Patrícia','João','Luiza','Eduardo','Camila'])
        [1 + floor(random()*10)::int] || ' ' ||
      (ARRAY['Silva','Souza','Oliveira','Pereira','Santos','Lima','Costa','Ferreira'])
        [1 + floor(random()*8)::int],
      CASE WHEN random() < 0.6 THEN
        (ARRAY['Transportadora','Logística','Distribuidora','Construtora','Frota Própria'])
          [1 + floor(random()*5)::int] || ' ' ||
        (ARRAY['Real','Express','Brasil','Norte','Sul','Plus'])
          [1 + floor(random()*6)::int]
      ELSE NULL END,
      '(11) 9' || lpad(floor(random()*99999999)::text, 8, '0'),
      'lead' || floor(random()*10000)::text || '@email.com',
      v_origens[1 + floor(random()*array_length(v_origens,1))::int],
      (v_estagios[1 + floor(random()*array_length(v_estagios,1))::int])::estagio_funil,
      round((3000 + random()*15000)::numeric, 2),
      v_mes_ini + (floor(random()*v_dias))::int,
      'Lead capturado no mês ' || p_mes || '/' || p_ano
    );

    v_n_inter := 2 + floor(random()*3)::int;
    FOR v_j IN 1..v_n_inter LOOP
      INSERT INTO crm_interacoes(lead_id, data, tipo, assunto, descricao)
      VALUES (
        v_lead_id,
        (v_mes_ini + (floor(random()*v_dias))::int)::timestamptz,
        (v_inter_tipos[1 + floor(random()*array_length(v_inter_tipos,1))::int])::tipo_interacao,
        (ARRAY['Primeiro contato','Apresentação de proposta','Follow-up','Negociação de valores','Esclarecimento técnico'])
          [1 + floor(random()*5)::int],
        'Interação registrada automaticamente.'
      );
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Dados gerados %-%: % OS', p_ano, p_mes, v_qtd_os;
END;
$fn$;

SELECT public.gerar_dados_mes(2026, 1);
SELECT public.gerar_dados_mes(2026, 2);
SELECT public.gerar_dados_mes(2026, 3);
SELECT public.gerar_dados_mes(2026, 4);
SELECT public.gerar_dados_mes(2026, 5);
SELECT public.gerar_dados_mes(2026, 6);
