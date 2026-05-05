
-- Reescala valores das OS para ticket médio realista (~R$ 3.000) alinhado ao histórico de referência
UPDATE ordens_servico SET
  valor_pecas = ROUND(valor_pecas * 0.33, 2),
  valor_servicos = ROUND(valor_servicos * 0.33, 2),
  valor_desconto = ROUND(valor_desconto * 0.33, 2),
  valor_total = ROUND(valor_total * 0.33, 2),
  custo_pecas = ROUND(custo_pecas * 0.33, 2);

UPDATE os_itens SET
  preco_unitario = ROUND(preco_unitario * 0.33, 2),
  custo_unitario = ROUND(custo_unitario * 0.33, 2),
  subtotal = ROUND(subtotal * 0.33, 2);

UPDATE pagamentos SET valor = ROUND(valor * 0.33, 2);

-- Ajusta despesas para serem coerentes com o porte da operação (reduz ~20%)
UPDATE despesas SET valor = ROUND(valor * 0.78, 2);
