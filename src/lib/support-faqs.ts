// Perguntas frequentes do app — conteúdo estático, editável aqui.
// Baseado nos módulos existentes (Clientes, Veículos, Ordens, Peças, CRM,
// Despesas, Fluxo de Caixa, Equipe) e em boas práticas de gestão de oficina.

export type Faq = {
  id: string;
  categoria: string;
  pergunta: string;
  resposta: string;
};

export const FAQS: Faq[] = [
  // Primeiros passos
  {
    id: "login",
    categoria: "Primeiros passos",
    pergunta: "Como faço login no sistema?",
    resposta:
      "Acesse a tela inicial e clique em Entrar. Use o e-mail e senha cadastrados, ou entre com sua conta Google. Caso seja seu primeiro acesso, peça ao administrador para liberar seu cadastro.",
  },
  {
    id: "senha",
    categoria: "Primeiros passos",
    pergunta: "Esqueci minha senha. O que faço?",
    resposta:
      "Na tela de login, clique em 'Esqueci minha senha' e informe seu e-mail. Você receberá um link para criar uma nova senha. Se não receber em alguns minutos, verifique a caixa de spam ou abra um ticket de suporte.",
  },
  {
    id: "instalar-pwa",
    categoria: "Primeiros passos",
    pergunta: "Posso instalar o app no celular ou desktop?",
    resposta:
      "Sim. O sistema é um PWA. No navegador (Chrome/Edge/Safari) procure a opção 'Instalar app' no menu, ou use o botão 'Instalar' que aparece na tela quando disponível. Depois de instalado, ele abre como um aplicativo normal.",
  },

  // Clientes & Veículos
  {
    id: "cadastrar-cliente",
    categoria: "Clientes & Veículos",
    pergunta: "Como cadastrar um novo cliente?",
    resposta:
      "Vá em Clientes > Novo cliente. Preencha nome, telefone, documento e demais dados. Salve e, em seguida, você pode vincular um ou mais veículos a este cliente na aba Veículos.",
  },
  {
    id: "vincular-veiculo",
    categoria: "Clientes & Veículos",
    pergunta: "Como vincular um veículo a um cliente?",
    resposta:
      "Em Veículos > Novo veículo, selecione o cliente proprietário na lista, informe placa, modelo, ano e KM atual. Um cliente pode ter vários veículos cadastrados.",
  },
  {
    id: "editar-cliente",
    categoria: "Clientes & Veículos",
    pergunta: "Como editar ou remover um cliente?",
    resposta:
      "Na lista de Clientes, clique no registro para abrir os detalhes. Use o botão Editar para alterar dados ou Excluir para remover. Atenção: clientes com OS vinculadas não podem ser excluídos — encerre as ordens primeiro.",
  },

  // Ordens de Serviço
  {
    id: "criar-os",
    categoria: "Ordens de Serviço",
    pergunta: "Como criar uma Ordem de Serviço (OS)?",
    resposta:
      "Vá em Ordens > Nova OS. Selecione o cliente e o veículo, descreva o problema relatado e adicione itens (peças e serviços). Ao salvar, a OS é criada com status 'Aberta'.",
  },
  {
    id: "itens-os",
    categoria: "Ordens de Serviço",
    pergunta: "Como adicionar peças e serviços a uma OS?",
    resposta:
      "Dentro da OS, use a seção Itens. Clique em 'Adicionar peça' (busca no estoque) ou 'Adicionar serviço' (busca no catálogo). Você pode ajustar quantidade, valor unitário e desconto. O total da OS é calculado automaticamente.",
  },
  {
    id: "status-os",
    categoria: "Ordens de Serviço",
    pergunta: "Como alterar o status da OS (em execução, aguardando peça, concluída)?",
    resposta:
      "Abra a OS e use o seletor de status no topo. Os status disponíveis são: Aberta, Em execução, Aguardando peça, Concluída e Cancelada. Ao marcar como Concluída, o estoque das peças usadas é baixado automaticamente.",
  },

  // Peças & Estoque
  {
    id: "cadastrar-peca",
    categoria: "Peças & Estoque",
    pergunta: "Como cadastrar uma nova peça no estoque?",
    resposta:
      "Acesse Peças > Nova peça. Informe código, descrição, fornecedor, custo, preço de venda e quantidade inicial em estoque. Cadastre também o estoque mínimo para receber alertas quando o nível ficar baixo.",
  },
  {
    id: "baixa-estoque",
    categoria: "Peças & Estoque",
    pergunta: "Quando o estoque de peças é baixado?",
    resposta:
      "A baixa ocorre automaticamente quando uma OS contendo a peça é marcada como 'Concluída'. Para ajustes manuais (perdas, devoluções, entrada de fornecedor), edite a peça e use o campo de quantidade.",
  },

  // Financeiro
  {
    id: "despesa",
    categoria: "Financeiro",
    pergunta: "Como lançar uma despesa?",
    resposta:
      "Vá em Despesas > Nova despesa. Informe categoria (aluguel, salário, energia, fornecedor etc.), valor, data de vencimento e forma de pagamento. Despesas pagas aparecem no Fluxo de Caixa.",
  },
  {
    id: "fluxo-caixa",
    categoria: "Financeiro",
    pergunta: "Onde vejo o fluxo de caixa da oficina?",
    resposta:
      "Em Fluxo de Caixa você vê entradas (OS pagas) e saídas (despesas e pagamentos a fornecedores) por período. Use os filtros de data para analisar o desempenho do mês ou comparar períodos.",
  },
  {
    id: "pagamento-os",
    categoria: "Financeiro",
    pergunta: "Como registrar o pagamento de uma OS?",
    resposta:
      "Abra a OS concluída e clique em 'Registrar pagamento'. Informe valor, forma (dinheiro, PIX, cartão, boleto) e a data. Pagamentos parciais são permitidos — o saldo pendente fica destacado até a quitação.",
  },

  // CRM
  {
    id: "crm-lead",
    categoria: "CRM",
    pergunta: "Como cadastrar um lead no CRM?",
    resposta:
      "No menu CRM, clique em Novo lead. Informe nome, contato, origem (indicação, redes sociais, passagem etc.) e o interesse. Depois você pode registrar interações (ligações, mensagens, visitas) e mover o lead pelo funil até virar cliente.",
  },

  // Conta & Integrações
  {
    id: "sheets",
    categoria: "Conta & Integrações",
    pergunta: "Como funciona a sincronização com Google Sheets?",
    resposta:
      "Em Configurações > Integração com Sheets, conecte sua planilha informando o ID. Os dados de clientes, OS e financeiro podem ser exportados periodicamente para a planilha — útil para relatórios externos ou backup. A sincronização não substitui o sistema, apenas espelha os dados.",
  },
  {
    id: "permissoes",
    categoria: "Conta & Integrações",
    pergunta: "Por que não consigo ver/editar alguns dados?",
    resposta:
      "O sistema controla o acesso por perfil. Cadastros operacionais (clientes, OS, peças) ficam restritos a usuários autorizados pelo administrador. Se você precisa de mais acesso, peça ao responsável pela oficina ou abra um ticket de suporte.",
  },
];

export const FAQ_CATEGORIES = Array.from(new Set(FAQS.map((f) => f.categoria)));
