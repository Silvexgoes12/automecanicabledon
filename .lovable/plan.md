
## Objetivo
Adicionar uma seção de **Perguntas Frequentes (FAQs)** na página `/app/suporte` para que os clientes encontrem respostas imediatas para dúvidas comuns antes de abrir um ticket — reduzindo volume de suporte e acelerando autoatendimento.

## Onde
- Arquivo: `src/routes/app.suporte.tsx` (única alteração de UI).
- Novo arquivo: `src/lib/support-faqs.ts` (conteúdo estático das FAQs, fácil de editar).

## Estrutura da UI
Na tela inicial do Suporte (antes das abas "Dúvidas / Feedback"):

```
┌─────────────────────────────────────────────┐
│ Suporte                          [+ Novo]   │
├─────────────────────────────────────────────┤
│ 📚 Perguntas Frequentes                     │
│ Antes de abrir um ticket, veja se sua       │
│ dúvida já está respondida abaixo.           │
│                                             │
│ [🔎 Buscar nas FAQs...]                     │
│                                             │
│ ▸ Como cadastrar um cliente?                │
│ ▸ Como criar uma Ordem de Serviço?          │
│ ▸ Como registrar peças e estoque?           │
│ ▸ ... (Accordion expansível)                │
│                                             │
│ Não achou? [Abrir um ticket]                │
├─────────────────────────────────────────────┤
│ [Tabs] Dúvidas | Feedback                   │
│ ... lista de tickets ...                    │
└─────────────────────────────────────────────┘
```

Componente: `<Accordion>` do shadcn (`src/components/ui/accordion.tsx` já existe) + `<Input>` para filtro client-side por título/conteúdo.

## Conteúdo das FAQs
Categorizadas por módulo do app, baseadas no que existe no projeto (rotas: Clientes, Veículos, Ordens, Peças, CRM, Despesas, Fluxo de Caixa, Equipe) e em boas práticas de gestão de oficina mecânica. Estimativa: ~12 perguntas.

Categorias e exemplos:
- **Primeiros passos**: como fazer login, esqueci a senha, navegação geral.
- **Clientes & Veículos**: cadastrar cliente, vincular veículo, editar dados.
- **Ordens de Serviço**: criar OS, adicionar itens (peças/serviços), mudar status, imprimir.
- **Peças & Estoque**: cadastro de peças, controle de entrada/saída, baixa via OS.
- **Financeiro**: lançar despesa, registrar pagamento, fluxo de caixa.
- **CRM**: cadastrar lead, registrar interação.
- **Conta & Sincronização**: integração com Google Sheets, atualização de dados.

Cada FAQ terá: `id`, `categoria`, `pergunta`, `resposta` (texto simples com passos).

## Comportamento
- Busca client-side: filtra perguntas/respostas por substring (case-insensitive).
- Accordion: expande uma de cada vez (`type="single" collapsible`).
- CTA "Não encontrei minha resposta" abre o diálogo "Novo ticket" já existente.
- Sem chamadas a server functions — conteúdo 100% estático.

## Fora do escopo
- Não altera banco de dados, RLS, server functions ou notificações por e-mail.
- Não cria CMS/editor de FAQs (lista é editada via código por enquanto).
- Não toca em outras páginas do app.
