
# Sincronização Google Sheets ↔ Fluxo de Caixa

## Observação importante antes de começar

Você pediu que "a base de dados seja o Sheets". Recomendo **não** substituir o banco do app pelo Sheets, e sim tratar a planilha como **espelho editável** dos Lançamentos. Motivos:

- O app já tem várias tabelas relacionadas (clientes, veículos, ordens, peças, despesas, equipe, CRM). Mover tudo para Sheets quebraria essas relações e a performance.
- Sheets tem limites (10M células, ~latência alta em leituras) e não tem RLS, controle transacional ou índices.
- O DRE, KPIs e Conciliação dependem de queries SQL rápidas que ficariam inviáveis lendo a planilha a cada abertura de tela.

**Modelo proposto:** Supabase continua sendo a base. O Sheets vira uma "interface de planilha" para a aba **Lançamentos** (a que você mais quer editar em massa). Você edita onde for mais cômodo e clica em **Sincronizar** para alinhar os dois lados.

Se quiser estender depois para Despesas ou Clientes, é só repetir o padrão.

---

## O que será entregue

1. **Conexão Google Sheets** via Lovable Cloud (OAuth uma vez, só sua conta).
2. **Nova aba "Sheets Sync"** dentro de Fluxo de Caixa, com:
   - Campo para colar a URL da planilha (salvo por usuário).
   - Botão **"Puxar do Sheets → App"**.
   - Botão **"Enviar do App → Sheets"**.
   - Botão **"Sincronizar (bidirecional)"**.
   - Status da última sincronização (data, quantidade criada/atualizada, conflitos).
3. **Template inicial**: ao conectar pela primeira vez, o app pode criar a planilha já com o cabeçalho correto.

## Como a sincronização decide o que fazer

Cada linha do Sheets terá uma coluna oculta `sync_id` (= id do lançamento no Supabase) e `updated_at`. O motor compara:

- Linha no Sheets sem `sync_id` → cria novo lançamento no app.
- Lançamento no app sem linha correspondente → adiciona linha no Sheets.
- Mesma `sync_id` dos dois lados → vence o `updated_at` mais recente (last-write-wins).
- Linha apagada no Sheets (com `sync_id` que existe no app) → marca o lançamento como excluído (com confirmação na UI mostrando quantos serão removidos).

Conflitos não-triviais (mesmo registro editado dos dois lados no mesmo minuto) entram numa lista que aparece após o clique, e você escolhe qual versão manter.

## Formato da planilha (aba `Lancamentos`)

| Coluna       | Tipo     | Obrigatória |
|--------------|----------|-------------|
| sync_id      | texto    | gerado      |
| data         | data     | sim         |
| tipo         | entrada/saida | sim    |
| categoria    | texto    | sim         |
| descricao    | texto    | sim         |
| valor        | número   | sim         |
| conta        | caixa/banco/cartao | sim |
| status       | previsto/realizado | sim |
| data_pagamento | data   | não         |
| updated_at   | data/hora| gerado      |

Validação de tipos é feita antes de gravar no Supabase — linhas inválidas aparecem num relatório e não bloqueiam o restante.

---

## Detalhes técnicos

- **Conector**: `google_sheets` via gateway do Lovable Cloud (`standard_connectors--connect`). Sua conta autoriza uma vez; nenhum usuário final precisa fazer OAuth.
- **Server function** `syncSheets` em `src/lib/sheets.functions.ts` com três modos: `pull`, `push`, `both`. Protegida por `requireSupabaseAuth`.
- Chama `https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets/{id}/values/Lancamentos!A:J` com `GET` para puxar e `PUT`/`append` para gravar.
- **Tabela nova** `sheets_config` (id, user_id, spreadsheet_id, last_sync_at) para guardar a URL conectada.
- Coluna nova `sync_external_id` em `lancamentos` para correlação (índice único).
- **UI**: nova aba dentro de `src/routes/app.fluxo-caixa.tsx` reaproveitando o padrão de tabs já existente (DRE, Conciliação, Lançamentos…).
- Botão de sincronização desabilita durante a operação e mostra toast com o resultado.

## Limitações honestas

- **Manual only** nesta primeira versão (você pediu botão manual). Webhook em tempo real do Sheets exige Apps Script extra — dá para adicionar depois.
- Funciona **só para Lançamentos** nesta entrega. Despesas/OS/Clientes ficam fora até validarmos o fluxo.
- Last-write-wins é simples. Se você editar a mesma linha nos dois lados sem sincronizar entre eles, o lado mais recente sobrescreve.

---

## Resumo das fases

1. Conectar Google Sheets via Lovable Cloud.
2. Migração: criar `sheets_config` e adicionar `sync_external_id` em `lancamentos`.
3. Implementar server function `syncSheets` (pull / push / both) com mapeamento + validação.
4. Adicionar aba **"Sheets"** em Fluxo de Caixa com URL, botões e relatório da última execução.
5. Criar template da planilha automaticamente na primeira conexão.

Pode confirmar para eu implementar?
