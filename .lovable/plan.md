# Plano: Privacidade de tickets + aba Resolvidos + aprovação de cadastros

## 1. Tickets visíveis apenas ao criador e ao Admin

As políticas de RLS já estão corretas (`auth.uid() = user_id OR is_app_admin(auth.uid())`), mas o servidor (`listTickets`) confia na sessão e a UI mostra "todos" para qualquer um logado porque o usuário de teste provavelmente é admin.

Ajustes:
- Em `src/lib/support.functions.ts` → `listTickets`: garantir filtro explícito quando não-admin (`.eq("user_id", userId)`) como defesa em profundidade.
- Em `src/routes/app.suporte.tsx`: o painel "Meus tickets" continua igual; admin vê todos com o e-mail do autor (já implementado).

## 2. Aba "Resolvidos"

Na sidebar de tickets de `app.suporte.tsx`:
- Substituir a lista única por **Tabs**: `Ativos` (status `aberto` + `respondido`) e `Resolvidos` (status `resolvido`).
- Badge com contagem em cada aba.
- Ao admin marcar como Resolvido (botão já existente via `setTicketStatus`), o ticket migra automaticamente para a aba Resolvidos.

## 3. Aprovação manual de novos cadastros

Hoje qualquer usuário criado no Auth entra direto no app. Vamos introduzir um status de aprovação.

### Banco (migration)
- Nova tabela `public.user_approvals`:
  - `user_id uuid PK references auth.users on delete cascade`
  - `email text`
  - `status text check in ('pendente','aprovado','rejeitado') default 'pendente'`
  - `requested_at timestamptz`, `decided_at timestamptz`, `decided_by uuid`
- GRANTs: `authenticated` select próprio; `service_role` ALL.
- RLS: usuário lê apenas a própria linha; admin (via `is_app_admin`) lê/edita todas.
- Função `public.is_user_approved(_uid uuid) returns boolean` (SECURITY DEFINER) — true se existir linha `aprovado` OU se `is_app_admin`.
- Trigger `on auth.users insert` → cria linha `pendente` automaticamente (e marca como `aprovado` se o e-mail já estiver em `app_admins`).

### Server functions (`src/lib/approvals.functions.ts`)
- `getMyApprovalStatus` (auth): retorna status do usuário corrente.
- `listPendingUsers` (auth + admin): lista pendentes/rejeitados com e-mail (via `supabaseAdmin.auth.admin.getUserById`).
- `approveUser({ userId })` / `rejectUser({ userId })` (auth + admin): atualiza status.

### UI
- **Gate de acesso**: no layout `src/routes/_authenticated/route.tsx` (ou em `src/routes/app.tsx`) chamar `getMyApprovalStatus` após login. Se `pendente`/`rejeitado`, renderizar página "Conta aguardando aprovação" com botão de logout — bloqueia o resto do app.
- **Nova rota admin** `src/routes/app.aprovacoes.tsx`:
  - Lista de cadastros pendentes (e-mail, data, botões Aprovar / Rejeitar).
  - Aba secundária com "Rejeitados" para reverter decisão.
  - Item no menu lateral (`AppShell`) visível apenas para admin, com badge da contagem de pendentes.

### Comportamento
- Usuário novo cria conta → entra → vê tela "Aguardando aprovação".
- Admin acessa `Aprovações`, aprova → próximo login (ou refresh) libera o app.
- Admins existentes (em `app_admins`) são auto-aprovados pelo trigger.

## Arquivos afetados
- `supabase/migrations/<novo>.sql` — tabela, RLS, função, trigger.
- `src/lib/support.functions.ts` — filtro defensivo em `listTickets`.
- `src/lib/approvals.functions.ts` — novo.
- `src/routes/app.suporte.tsx` — Tabs Ativos/Resolvidos.
- `src/routes/app.tsx` (ou `_authenticated/route.tsx`) — gate de aprovação.
- `src/routes/app.aprovacoes.tsx` — nova rota admin.
- `src/components/AppShell.tsx` — item de menu "Aprovações" (admin only).
