
## Diagnóstico
Os dados continuam intactos no banco (100 clientes, 750 OS, 1.658 lançamentos, etc.). O dashboard mostra "zerado" porque a última rodada de segurança trocou as policies de RLS de **todas as tabelas de negócio** para `is_app_admin(auth.uid())`. Apenas `financeiro@plinenergia.com.br` é admin — o usuário logado agora (`emanuelbritomanu12@gmail.com`) é bloqueado e recebe 0 em tudo.

## Correção (uma migração)
Reverter as policies das tabelas de negócio para **"qualquer usuário autenticado"**, mantendo Suporte e admins como estão.

Tabelas afetadas (SELECT/INSERT/UPDATE/DELETE → `TO authenticated USING (true) WITH CHECK (true)`):
- `clientes`, `veiculos`, `ordens_servico`, `os_itens`
- `pecas`, `servicos_catalogo`, `fornecedores`, `funcionarios`
- `despesas`, `lancamentos`, `pagamentos`
- `crm_leads`, `crm_interacoes`

Para cada tabela: `DROP POLICY` das 4 policies `admin_*` e recriar como `auth_all_select/insert/update/delete` com predicado `true` para `authenticated`. RLS continua habilitado.

## O que NÃO muda
- `app_admins`: continua restrito ao admin (somente admin lê/edita).
- `support_tickets` / `support_messages`: continuam com o modelo cliente-vê-só-os-próprios e admin-vê-tudo / só admin responde.
- `sheets_config`: continua por-usuário.
- Função `is_app_admin` permanece (Suporte ainda usa).
- Nenhuma alteração de código de UI — assim que a policy mudar, o dashboard volta a mostrar os 100 clientes, 750 OS, faturamento, despesas, gráficos, etc.

## Memória de segurança
Atualizar `security memory` para refletir o novo modelo: app é single-tenant da oficina, qualquer usuário autenticado acessa os dados operacionais; apenas Suporte (responder) e `app_admins` (lista) são admin-only.

## Aviso de segurança aceito
Esse modelo significa que qualquer e-mail que crie conta no app passa a ver todos os dados. Recomendação opcional (não incluída nesta correção, posso fazer depois se quiser): desativar self-signup no Lovable Cloud, deixando criação de usuários apenas por convite.
