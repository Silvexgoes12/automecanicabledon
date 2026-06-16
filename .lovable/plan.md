## Aba "Suporte" dentro do app

Nova seção no menu lateral com duas sub-abas: **Feedback** (envio único, sem resposta) e **Dúvidas** (ticket com troca de mensagens). Cada cliente vê apenas os seus próprios envios; o admin vê todos e é o único que pode responder.

### Banco de dados

Três tabelas novas em `public`:

1. `support_tickets` — `id`, `user_id`, `tipo` ('duvida' | 'feedback'), `assunto`, `status` ('aberto' | 'respondido' | 'resolvido'), `created_at`, `updated_at`.
2. `support_messages` — `id`, `ticket_id`, `user_id` (autor), `is_admin` (bool), `mensagem`, `created_at`.
3. `app_admins` — `email` (PK). Pré-populada com `financeiro@plinenergia.com.br`. Função `is_admin(uid)` SECURITY DEFINER cruza `auth.users.email` com essa tabela.

RLS:

- Cliente: SELECT/INSERT só nos próprios tickets/mensagens; não pode marcar `is_admin=true`.
- Admin (via `is_admin(auth.uid())`): SELECT/INSERT/UPDATE em tudo.
- Feedback: trava INSERT de mensagens adicionais (somente a primeira mensagem do autor).

GRANTs para `authenticated` e `service_role` em todas as três.

### Backend (server functions)

`src/lib/support.functions.ts` com `requireSupabaseAuth`:

- `listTickets` — admin recebe todos com nome/email do autor; cliente recebe os próprios.
- `createTicket({ tipo, assunto, mensagem })` — cria ticket + 1ª mensagem.
- `addMessage({ ticketId, mensagem })` — bloqueia em feedback; atualiza status (admin → 'respondido', cliente → 'aberto').
- `setStatus({ ticketId, status })` — só admin.

Cada mutação enfileira um e-mail de notificação (sem bloquear a resposta se falhar).

### E-mail (Resend)

Conector Resend (vou pedir aprovação para vincular). Helper `src/lib/email.server.ts` envia via gateway Lovable:

- Novo ticket/feedback → e-mail para `financeiro@plinenergia.com.br` com link `/app/suporte?ticket=<id>`.
- Resposta do admin → e-mail para o autor do ticket.
- Remetente: `onboarding@resend.dev` (placeholder até verificar domínio próprio no Resend).

### UI

`src/routes/app.suporte.tsx` + entrada no `AppShell`:

- Tabs internas: **Dúvidas** | **Feedback** | (admin) **Todos**.
- Lista de tickets (assunto, status badge, data, autor se admin).
- Botão "Novo" abre dialog (tipo, assunto, mensagem).
- Drawer/painel do ticket: thread de mensagens, composer (admin sempre, cliente só em dúvidas não resolvidas), botão "Marcar como resolvido" (admin).
- Estado vazio amigável e contagem de não-lidos por status.

### Sequência de execução

1. Migration (tabelas + `is_admin` + RLS + seed admin).
2. Vincular conector Resend (requer aprovação sua).
3. `support.functions.ts` + helper de e-mail.
4. Rota `app.suporte.tsx` + componentes + item no menu.
5. Teste manual: criar dúvida com conta cliente, responder logado como [emanuelbritomanu12@gmail.com](mailto:emanuelbritomanu12@gmail.com) e `financeiro@plinenergia.com.br`, conferir e-mails.

### Observações

- Apenas o e-mail listado em `app_admins` consegue responder; para adicionar outros admins basta inserir uma linha (sem mexer em código).
- Sem anexos nesta fase.
- Notificações apenas por e-mail; sem badge em tempo real (pode entrar depois).