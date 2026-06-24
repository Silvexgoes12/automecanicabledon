## Objetivo

Popular o ano de 2026 (Janeiro a Junho, considerando que estamos em junho/2026) em **todas as abas** do sistema — Ordens de Serviço, Despesas, Fluxo de Caixa, Pagamentos, CRM (leads e interações) — usando como base os padrões mensais de 2024 e 2025 com um leve crescimento anual. Em seguida, deixar o processo **semi-automático**: todo mês o sistema gera os dados do mês corrente a partir da média histórica dos anos anteriores.

## Base estatística (já analisada)

Olhando os dados atuais:

```text
Mês     | OS 2024 | OS 2025 | Receita 2024 | Receita 2025
Jan     |   22    |   36    |   54.685     |  106.913
Fev     |   28    |   37    |   98.254     |  106.765
Mar     |   37    |   40    |  117.086     |  105.598
Abr     |   40    |   30    |  115.114     |  114.187
Mai     |   33    |   29    |   85.815     |   85.811
Jun     |   24    |   18    |   63.094     |   66.314
```

Crescimento médio 2025 vs 2024: ~+10% em receita. O modelo de 2026 aplicará **+12% sobre a média dos dois anos** para cada mês, mantendo a sazonalidade.

## Escopo de dados a gerar para 2026 (Jan–Jun)

Para cada mês de 2026:

1. **Ordens de Serviço** (`ordens_servico`)
   - Número de OS = média(2024, 2025) do mês × 1.05, arredondado
   - Para cada OS: cliente aleatório existente, veículo do cliente, mecânico aleatório, status "concluida" (exceto algumas "em_andamento" no mês corrente), data dentro do mês
   - `valor_total` ≈ ticket médio histórico do mês × 1.12 ± variação aleatória
   - `numero` sequencial continuando a partir do último

2. **Itens de OS** (`os_itens`)
   - Entre 2 e 6 itens por OS (mix de peças do catálogo e serviços), reproduzindo a proporção atual peças/serviços

3. **Pagamentos** (`pagamentos`)
   - 1 pagamento por OS concluída, data = data_conclusao, forma variada (PIX, cartão, dinheiro)

4. **Despesas** (`despesas`)
   - Recorrentes mensais (folha, aluguel, energia, água, internet, contabilidade, impostos) com valor = média histórica × 1.08
   - Variáveis (compra de peças, manutenção, marketing, combustível) proporcionais ao volume de OS do mês

5. **Lançamentos de fluxo de caixa** (`lancamentos`)
   - Entrada para cada pagamento (tipo='receita', categoria='servicos', vinculado à OS)
   - Saída para cada despesa (tipo='despesa')

6. **CRM** (`crm_leads`, `crm_interacoes`)
   - ~5–8 novos leads por mês com estágios variados
   - 2–4 interações por lead ativo

Nenhuma alteração em `clientes`, `veiculos`, `funcionarios`, `pecas`, `servicos_catalogo`, `fornecedores` (já populados).

## Execução semi-automática mensal

Criar uma **função PL/pgSQL** `public.gerar_dados_mes(ano int, mes int)` que encapsula toda a lógica de geração acima, idempotente (não duplica se rodada de novo no mesmo mês — checa se já existem OS naquele mês).

Agendar via **pg_cron** para rodar todo dia 1º às 03:00:

```sql
SELECT cron.schedule(
  'gerar-dados-mes-corrente',
  '0 3 1 * *',
  $$ SELECT public.gerar_dados_mes(
       extract(year  from now())::int,
       extract(month from now())::int
     ); $$
);
```

Assim, em julho/2026 o sistema gera automaticamente julho, em agosto gera agosto, e assim por diante — sempre baseado na média dos anos anteriores disponíveis no banco.

## Passos de implementação

1. **Migração 1 — função geradora**: criar `public.gerar_dados_mes(ano, mes)` idempotente com toda a lógica acima.
2. **Migração 2 — popular Jan–Jun/2026**: chamar a função 6× dentro da migração.
3. **Migração 3 — agendamento pg_cron**: habilitar extensão `pg_cron` (se ainda não) e registrar o job mensal.
4. **Sem mudanças no frontend** — as abas já leem os dados do banco e o seletor de ano do Dashboard ganhará "2026" automaticamente porque o filtro só compara prefixo de data.
   - Pequeno ajuste opcional: adicionar "2026" ao seletor de anos no `src/routes/app.index.tsx` (hoje está fixo em `"all" | "2024" | "2025"`).

## Notas técnicas

- A função usa `gen_random_uuid()` e respeita todas as FKs existentes (clientes, veículos, mecânicos, peças, serviços, fornecedores já no banco).
- A geração é determinística por mês via `setseed()` para que re-execução produza o mesmo resultado, mas com idempotência via checagem prévia.
- Após a migração, total estimado de novos registros: ~190 OS, ~750 itens, ~190 pagamentos, ~120 despesas, ~310 lançamentos, ~40 leads, ~120 interações.
- O Dashboard, Ordens, Fluxo de Caixa, Despesas e CRM passam a refletir 2026 imediatamente após a migração.
