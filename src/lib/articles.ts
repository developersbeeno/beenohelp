export type Article = {
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  icon: string;
  content: string;
};

export type Category = {
  key: string;
  label: string;
  items: { slug: string; title: string }[];
};

export const articles: Article[] = [
  //  PRIMEIROS PASSOS
  {
    slug: "visao-geral",
    title: "Visão geral do Beeno",
    description: "O que é o Beeno CRM, sua estrutura e como começar.",
    category: "primeiros-passos",
    categoryLabel: "Primeiros passos",
    icon: "inicio",
    content: `## O que é o Beeno

O **Beeno** é um CRM completo desenvolvido pela Skeps para gestão comercial, marketing e atendimento. Centraliza dados de clientes, automatiza processos e integra canais de comunicação em um único lugar.

## Objetos principais

| Objeto | Descrição |
|--------|-----------|
| **Contatos** | Leads e clientes, com histórico completo |
| **Negócios** | Oportunidades de venda organizadas em pipelines |
| **Empresas** | Organizações associadas a contatos |
| **Pipelines** | Funis com etapas customizáveis |
| **Propriedades** | Campos customizados por objeto |
| **Tarefas** | Atividades e follow-ups do time |
| **Segmentos** | Grupos filtrados de contatos |
| **Automações** | Fluxos, chatbots e agentes de IA |`,
  },
  {
    slug: "glossario",
    title: "Glossário CRM",
    description: "Principais termos e conceitos do Beeno CRM.",
    category: "primeiros-passos",
    categoryLabel: "Primeiros passos",
    icon: "glossario",
    content: `## Objetos

Objetos são os tipos de registros no CRM: **Contatos**, **Negócios** e **Empresas**. Cada objeto possui propriedades que armazenam informações específicas.

## Propriedades

Campos que descrevem e armazenam informações sobre cada objeto. Podem ser padrão (nome, e-mail, telefone) ou **customizadas** (criadas pela sua equipe).

## Segmentos

Grupos específicos de contatos filtrados com base em critérios de propriedades. Úteis para campanhas e automações segmentadas.

## Pipeline

Representação visual das etapas do processo de vendas ou qualquer fluxo operacional. Acompanha o progresso de leads desde o primeiro contato até o fechamento.

## Landing Page

Página web criada para capturar leads com foco em uma única ação (CTA). No Beeno, pode ser criada nativamente e integrada ao CRM.

## Lead Score (Pontuação)

Sistema de pontuação que avalia o nível de interesse de um lead com base em suas ações (e-mails abertos, páginas visitadas, formulários preenchidos). Ajuda a priorizar os contatos mais quentes.

## Fluxo de Automação

Sequência automatizada de ações (envio de e-mails, criação de tarefas, movimentação de pipeline) disparadas por eventos ou condições específicas.`,
  },
  {
    slug: "conta-e-configuracoes",
    title: "Conta e configurações",
    description: "Ajustes gerais, moedas, personalização e segurança da conta.",
    category: "conta-configuracao",
    categoryLabel: "Conta e Configuração",
    icon: "config",
    content: `## Configurações gerais

Acesse **Configurações → Conta** no menu lateral para editar dados gerais da empresa: nome, site, segmento de atuação, idioma padrão e identidade visual usada nos e-mails.

## Moedas (multimoeda)

A aba **Moeda** centraliza a operação com múltiplas moedas no CRM. Nela você adiciona as moedas usadas nos campos de propriedade do tipo moeda, escolhe a **moeda padrão da conta** e define como as taxas de conversão são atualizadas.

- Moedas suportadas: **USD**, **EUR**, **BRL** e **AED**
- A lista mostra todas as moedas cadastradas, qual é a padrão e a taxa de conversão de cada uma em relação a ela

### Criar uma nova moeda

1. Acesse **Configurações → Conta → Moeda**
2. Clique em **Criar moeda** e selecione o tipo (USD, EUR, BRL ou AED)
3. Marque **Definir como moeda padrão da conta**, se for o caso

Quando uma moeda é definida como padrão, todos os campos do tipo moeda passam a usá-la como referência em toda a plataforma, inclusive para o cálculo das taxas das demais moedas.

### Sincronização automática de taxas

Ative a sincronização para que o CRM atualize as taxas de câmbio uma vez ao dia, sempre com base na moeda padrão. O botão **Ver histórico** mostra o registro de todas as atualizações, útil para auditar altas e baixas na cotação ao longo do tempo.

### Ajuste manual (taxa fixa)

Clique diretamente no valor da taxa de conversão na tabela para travá-la manualmente. Isso é útil quando existe um câmbio acordado em contrato. Se a conversão automática estiver ativa e alguém fizer um ajuste manual, o CRM sinaliza a moeda na listagem como "ajustada manualmente". Para retomar a atualização automática, use **Mais ações → Reativar sincronização**.

> **Dica**: use conversão automática para relatórios e pipelines internacionais que precisam de valores sempre atualizados; use taxa fixa quando houver um câmbio contratual acordado.

## Domínios

Para enviar e-mails com domínio próprio e publicar landing pages personalizadas, configure o apontamento DNS em **Marketing → Domínios**. Veja o passo a passo completo no artigo [Domínios](#).

## Segurança

- **2FA**: recomendamos ativar a autenticação de dois fatores para todos os administradores (veja em [Usuários e permissões](#))
- **Chaves de integração**: gere e revogue em **Configurações → Integrações → Chaves de integração** (veja em [Webhooks e Integrações](#))
- **Revisão periódica**: revogue chaves não utilizadas regularmente
- **Logs de acesso**: acompanhe acessos suspeitos em Configurações → Segurança

## Notificações

Configure quais eventos geram notificações por e-mail ou dentro da plataforma em **Configurações → Notificações**.`,
  },
  {
    slug: "usuarios-permissoes",
    title: "Usuários e permissões",
    description: "Convide usuários, configure papéis, equipes e 2FA.",
    category: "conta-configuracao",
    categoryLabel: "Conta e Configuração",
    icon: "usuarios",
    content: `## Convidando usuários

1. Acesse **Configurações → Usuários**
2. Clique em **Convidar usuário**
3. Informe o e-mail e selecione o papel (Admin, Gerente, Operador)
4. O usuário receberá um e-mail com link de acesso

## Papéis disponíveis

| Papel | Descrição |
|-------|-----------|
| **Admin** | Acesso total, incluindo configurações e faturamento |
| **Gerente** | Visualiza todos os dados, sem acesso a configurações críticas |
| **Operador** | Acesso restrito ao pipeline e contatos definidos |

## Permissões

Além dos papéis padrão, o Beeno permite configurar o acesso de cada usuário com dois níveis de controle:

- **Permissão personalizada**: define exatamente o que um usuário específico pode ver, fazer ou editar em cada módulo (contatos, negócios, empresas, relatórios etc.)
- **Grupo de permissões**: cria um perfil de acesso reutilizável para várias pessoas com a mesma função. Ideal quando várias pessoas do time precisam do mesmo nível de acesso

Para criar um grupo de permissões:
1. Acesse **Configurações → Usuários → Grupos de Permissão**
2. Crie um grupo com nome descritivo (ex.: "SDR", "Gerente Comercial")
3. Defina permissões por módulo (visualizar, editar, deletar)
4. Atribua usuários ao grupo

## Equipes

Agrupe usuários em equipes para segmentar acessos, visualizações e distribuir leads automaticamente:

1. Acesse **Configurações → Usuários → Equipes**
2. Clique em **+ Nova equipe** e dê um nome (ex.: "Vendas SP")
3. Adicione os membros clicando em **+ Adicionar membro**

## Autenticação de dois fatores (2FA)

Cada usuário pode ativar 2FA em **Perfil → Segurança → Ativar 2FA**, usando um app autenticador (Google Authenticator, Authy). Recomendado para todos os administradores da conta.`,
  },

  //  CRM
  {
    slug: "contatos",
    title: "Contatos",
    description: "Crie, busque, atualize e gerencie contatos no CRM.",
    category: "crm",
    categoryLabel: "CRM",
    icon: "contato",
    content: `## O que são contatos

A área de Contatos é onde todas as informações relevantes sobre seus leads e clientes ficam armazenadas centralmente: dados de contato, histórico de interações, negociações anteriores, preferências e demais informações pertinentes. Isso permite que sua equipe gerencie e cultive relacionamentos, acompanhe a comunicação, defina lembretes de follow-up e personalize cada interação.

## Criando um contato

1. Acesse **CRM → Contatos**
2. Clique em **+ Novo contato**
3. Preencha as propriedades definidas para o cadastro (nome, e-mail, telefone e demais campos)
4. Clique em **Salvar**

## Buscando um contato

Use a barra de busca no topo da lista de contatos para encontrar por nome, e-mail ou telefone. Para critérios mais específicos, use os filtros avançados da lista, por exemplo, buscar todos os contatos de um estado ou de um proprietário específico.

## Ações em massa

É possível selecionar vários contatos na listagem e excluí-los ou editar uma propriedade em todos de uma só vez. Também é possível selecionar um ou vários contatos e inscrevê-los em um fluxo de automação já existente diretamente pela listagem, ou inscrever um contato específico pelo próprio registro dele.

## Registro e associações

Na Timeline do contato (Atividades Recentes), todas as ações realizadas nele ou relacionadas a ele ficam registradas, facilitando o histórico e o acompanhamento das informações mais importantes. Você pode expandir cada atividade para ver detalhes ou recolher para visualizar só um resumo.

Um contato pode ser associado a outros objetos para uma gestão mais completa:
- **Negócios**: acompanhe todas as oportunidades de venda relacionadas a esse contato
- **Empresas**: mantenha o contexto organizacional, vendo interações e negócios da empresa em que o contato trabalha
- **Tarefas**: associe follow-ups, ligações, e-mails e reuniões relacionados ao contato
- **Anexos**: acesse documentos importantes, como contratos e propostas, direto do registro

## Ações em contatos

Na interface, acesse um contato para:
- Adicionar notas (geral, e-mail, ligação, reunião)
- Criar tarefas e follow-ups
- Enviar e-mail
- Associar a negócios e empresas
- Adicionar etiquetas

## Exportar contatos

Aplique os filtros desejados na listagem e clique em **Exportar**. O CRM gera um arquivo em CSV, que pode ser convertido em Excel.

## Cadastro em lote

Para cadastrar vários contatos de uma vez, use a opção **Importar** na tela de Contatos e envie uma planilha. Veja o artigo de Importação de dados para o passo a passo completo.`,
  },
  {
    slug: "negocios",
    title: "Negócios",
    description: "Gerencie oportunidades de venda em pipelines.",
    category: "crm",
    categoryLabel: "CRM",
    icon: "negocio",
    content: `## O que são negócios

Um negócio representa uma oportunidade ou transação que sua empresa acompanha: seja para vendas, suporte, pós-venda, implantação ou qualquer outro processo com etapas sequenciais. Já o pipeline (funil) é a estrutura onde esses negócios são organizados e visualizados por estágio, facilitando o monitoramento do progresso de cada oportunidade.

A vantagem de ter pipelines personalizados é que você pode adaptar as etapas para diferentes fluxos (comercial, onboarding de clientes, renovação de contratos e outros), permitindo que cada equipe acompanhe suas próprias atividades com clareza.

## Criando um negócio

1. Acesse o pipeline desejado em **CRM → Negócios**
2. Clique em **+ Novo negócio** na etapa inicial
3. Preencha nome, valor, responsável e associe contatos ou empresas relacionadas

## Movendo de etapa

Arraste o card do negócio para a etapa desejada no quadro Kanban, ou abra o negócio e altere a etapa diretamente no campo correspondente.

## Buscando e filtrando negócios

A listagem de negócios traz a visão geral de todas as oportunidades em andamento, com opção de personalizar quais campos aparecem e a ordem das colunas. Alguns filtros úteis:
- **Contatos associados**: negócios relacionados a um contato específico
- **Empresa associada**: oportunidades vinculadas a uma empresa
- **Proprietário**: agrupa negócios por responsável
- **Data de fechamento / criação**: prioriza por prazo ou analisa o histórico do funil
- **Filtros avançados**: combine pipeline, etapa e propriedades personalizadas

## Associando produtos

Abra o negócio, acesse a seção de produtos e clique em **+ Adicionar produto** para vincular itens do catálogo, com quantidade e desconto.

## Visão Kanban

O Kanban exibe os negócios em colunas por etapa. Configure quais propriedades aparecem nos cards em **Configurações → Pipelines → Personalização do Kanban**.

## Colaboração

Adicione colaboradores a um negócio para compartilhar visibilidade sem transferir a propriedade. Acesse o negócio e clique em **+ Colaborador**.

## Cadastro em lote

Para criar vários negócios de uma vez, use a opção **Importar** na tela de Negócios. Veja o artigo de Importação de dados para o passo a passo completo.`,
  },
  {
    slug: "empresas",
    title: "Empresas",
    description: "Gerencie organizações associadas a contatos e negócios.",
    category: "crm",
    categoryLabel: "CRM",
    icon: "empresa",
    content: `## O que são empresas

Empresas são organizações (CNPJs, contas corporativas) que você pode associar a contatos e negócios. Útil para operações B2B onde múltiplos contatos pertencem a uma mesma empresa.

## Criando uma empresa

1. Acesse **CRM → Empresas**
2. Clique em **+ Nova empresa**
3. Preencha nome, domínio, cidade e demais propriedades

## Buscando empresas

Use a busca ou os filtros da lista de empresas para localizar por nome, domínio, cidade ou estado.

## Associando contato a uma empresa

Abra a empresa e clique em **+ Associar contato**, ou associe pelo próprio cadastro do contato.

## Atualizando uma empresa

Abra a empresa desejada e edite os campos diretamente. As alterações são salvas automaticamente.

## Cadastro em lote

Para cadastrar várias empresas de uma vez, use a opção **Importar** na tela de Empresas. Veja o artigo de Importação de dados para o passo a passo completo.`,
  },
  {
    slug: "pipelines",
    title: "Pipelines",
    description: "Crie e configure funis de venda com etapas customizadas.",
    category: "crm",
    categoryLabel: "CRM",
    icon: "pipeline",
    content: `## O que são pipelines

Pipelines são funis de vendas que organizam negócios em etapas sequenciais, do primeiro contato ao fechamento. Cada empresa pode ter múltiplos pipelines para diferentes processos (vendas, pós-venda, reativação, etc.).

## Criando um pipeline

1. Acesse **Configurações → Pipelines**
2. Clique em **+ Novo pipeline**
3. Dê um nome e adicione as etapas na ordem desejada, definindo a probabilidade de fechamento de cada uma

## Personalização do Kanban

Em **Configurações → Pipelines → Personalização**, você pode:
- Escolher quais propriedades aparecem nos cards
- Definir a ordem de exibição dos campos
- Adicionar indicadores visuais por propriedade

## Regras de etapa

Configure restrições para controlar quando um negócio pode avançar:
1. Acesse **Configurações → Pipelines**
2. Selecione o pipeline e clique em **Regras**
3. Defina propriedades obrigatórias por etapa

## Rótulos

Adicione rótulos coloridos a negócios para identificação visual rápida (ex: "Urgente", "VIP", "Em negociação"). Configure em **Configurações → Rótulos**.`,
  },
  {
    slug: "propriedades",
    title: "Propriedades",
    description: "Crie e gerencie campos customizados para objetos do CRM.",
    category: "crm",
    categoryLabel: "CRM",
    icon: "propriedade",
    content: `## O que são propriedades

Propriedades são campos personalizados ou padrão que armazenam informações sobre os diferentes objetos do CRM: contatos, negócios e empresas. Elas funcionam como os "atributos" que descrevem um objeto, guardando informações estruturadas conforme a necessidade do seu negócio.

Alguns exemplos comuns:
- **Contatos**: nome, e-mail, telefone, cargo, data de criação
- **Negócios**: valor, etapa do pipeline, probabilidade de fechamento, data de fechamento esperada
- **Empresas**: nome da empresa, segmento, número de funcionários, endereço

## Criando uma propriedade customizada

1. Acesse **Configurações → Propriedades**
2. Escolha o objeto (Contato, Negócio ou Empresa) e clique em **+ Nova propriedade**
3. Defina nome e tipo
4. Salve para disponibilizar o campo nos cadastros

Configurar uma propriedade vai além de atribuir um nome: também é possível definir diferentes campos de preenchimento e obrigatoriedades para cada objeto.

## Tipos de propriedade

| Tipo | Descrição |
|------|-----------|
| Texto | Texto livre |
| Número | Valor numérico |
| Data | Armazena datas no formato dia/mês/ano |
| Data/Hora | Armazena data e hora |
| Seletor único | Permite escolher uma opção em uma lista |
| Múltipla escolha | Permite escolher mais de uma opção em uma lista |
| Checkbox | Verdadeiro/falso |
| Moeda | Valor monetário |
| Usuário | Exibe como opções os usuários cadastrados no CRM |

## Obrigatória e Identificador Único

Além do tipo, cada propriedade pode ter duas configurações adicionais:
- **Obrigatória**: torna o preenchimento do campo necessário para criar o objeto
- **Identificador único**: garante que não existam dois registros com o mesmo valor nessa propriedade, evitando duplicidade

>  Configure "Identificador único" apenas em campos que realmente têm um valor exclusivo por contato, como e-mail. Usar essa opção de forma inadequada pode causar fusão de contatos em massa e rastreio incorreto de atividades.

## Propriedades condicionais

Configure propriedades que só aparecem quando outra propriedade tem um valor específico. Em **Configurações → Propriedades → Condicionais**.

## Configurações de exibição

Escolha quais propriedades aparecem e em qual ordem nas páginas de contatos, negócios e empresas em **Configurações → Propriedades → Configurações de Exibição**.

## Boas práticas

- Use nomenclaturas claras e padronizadas para facilitar a compreensão da equipe
- Mantenha as propriedades atualizadas e remova campos que não são mais utilizados
- Treine a equipe para preencher as informações de forma consistente
- Use automações para preencher ou atualizar propriedades automaticamente quando possível`,
  },
  {
    slug: "tarefas",
    title: "Tarefas",
    description: "Crie e gerencie atividades e follow-ups do time.",
    category: "crm",
    categoryLabel: "CRM",
    icon: "tarefa",
    content: `## O que são tarefas

Tarefas são atividades ou ações específicas atribuídas a usuários ou equipes para garantir o acompanhamento e a gestão eficiente de relacionamentos e processos de vendas. Elas ajudam a manter o fluxo de trabalho organizado e garantem que nenhum aspecto do relacionamento com o cliente seja negligenciado. É possível criar e gerenciar tarefas tanto pela área dedicada quanto diretamente pelos objetos (contatos e negócios).

## Criando uma tarefa

1. Acesse **CRM → Tarefas** e clique em **Nova tarefa**, ou abra o contato/negócio relacionado
2. Preencha os campos necessários: título, data de vencimento, tipo e prioridade
3. Associe a um contato ou negócio, se aplicável

Os objetos atrelados podem ser abertos rapidamente pela própria listagem de tarefas, facilitando a execução e o acompanhamento.

## Tipos de tarefa

- To do
- Ligação
- E-mail

## Buscando e exportando tarefas

Use os filtros da lista de tarefas para ver, por exemplo, apenas as tarefas em aberto de um responsável específico. Combine o filtro por período de vencimento ou status para relatórios personalizados (tarefas vencidas, concluídas ou pendentes). Depois de filtrar, clique em **Exportar** para gerar um arquivo em CSV.

## Acompanhamento e conclusão

O responsável por uma tarefa é notificado por e-mail e por pop-up quando ela chega na data e horário de vencimento. O percentual de andamento fica visível na listagem, e a conclusão pode ser feita direto pelo objeto atrelado ou pela própria tabela de tarefas, clicando no ícone de status:
- **Amarelo**: tarefas a vencer
- **Vermelho**: tarefas que passaram do vencimento sem serem concluídas`,
  },
  {
    slug: "produtos",
    title: "Produtos",
    description: "Gerencie o catálogo de produtos e regras de desconto.",
    category: "crm",
    categoryLabel: "CRM",
    icon: "produto",
    content: `## O que são produtos

Produtos são os itens ou serviços que sua empresa vende ou oferece aos clientes. A funcionalidade de produtos permite gerenciar e rastrear informações detalhadas sobre o catálogo, facilitando a organização, as vendas e o suporte.

## Cadastrando um produto

1. Acesse **CRM → Produtos**
2. Clique em **Criar Produto**
3. Insira os dados obrigatórios (nome e preço unitário) e outros detalhes opcionais

Após a criação, o produto já fica disponível para ser associado a negociações. Os campos de cadastro de produto são padrão da ferramenta, sem opção de personalização adicional.

## Associando produto a um negócio

Acesse a associação de produtos na lateral direita do negócio e clique em **+ Adicionar produto**. Defina quantidade e desconto para cada item associado.

## Regras de desconto

Configure limites máximos de desconto por produto ou categoria em **Configurações → Produtos → Regras de Desconto**.

Isso garante que vendedores não ofereçam descontos além do permitido pela política comercial.

## Buscando produtos

Use os filtros da lista de produtos para localizar por faixa de preço ou outra propriedade.`,
  },
  {
    slug: "etiquetas",
    title: "Etiquetas",
    description: "Organize contatos e negócios com tags.",
    category: "crm",
    categoryLabel: "CRM",
    icon: "etiqueta",
    content: `## O que são etiquetas

As etiquetas funcionam como marcadores ou palavras-chave que você pode adicionar a registros (como contatos ou negócios) para organizar e categorizar informações de forma mais eficiente. Elas também permitem automações dentro dos fluxos de trabalho, facilitando ainda mais a gestão do CRM.

## Criando uma etiqueta

1. Acesse **CRM → Etiquetas**
2. Clique em **Criar etiqueta**
3. Preencha o nome e a descrição
4. Cadastre para criar a etiqueta

## Aplicando uma etiqueta

Na lateral de exibição de um contato ou negócio, é possível atrelar etiquetas existentes ou remover essa associação a qualquer momento.

## Consultando registros por etiqueta

Acesse a área de Etiquetas e clique na quantidade de registros de uma etiqueta específica para ver a listagem completa de contatos e negócios que a possuem.`,
  },
  {
    slug: "paineis",
    title: "Painéis personalizados",
    description: "Crie dashboards com métricas da operação.",
    category: "crm",
    categoryLabel: "CRM",
    icon: "painel",
    content: `## O que são painéis

Painéis (dashboards) são telas com gráficos e métricas personalizados para acompanhar a performance comercial em tempo real.

## Criar painel

1. Acesse **Painéis** no menu lateral
2. Clique em **+ Novo painel**
3. Dê um nome ao painel
4. Adicione widgets clicando em **+ Adicionar widget**

## Tipos de widget disponíveis

- **Gráfico de barras**: volume de negócios por etapa, por período
- **Gráfico de linhas**: evolução ao longo do tempo
- **Pizza/Donut**: distribuição por categoria
- **Número (KPI)**: valor único em destaque (ex: total de leads)
- **Tabela**: lista detalhada com propriedades customizadas
- **Funil**: taxa de conversão entre etapas

## Métricas populares

| Métrica | Descrição |
|---------|-----------|
| Leads gerados | Total de novos contatos por período |
| Taxa de conversão | % de leads que fecharam |
| Ticket médio | Valor médio dos negócios fechados |
| Ciclo de vendas | Tempo médio do primeiro contato ao fechamento |
| Atividades por vendedor | Produtividade individual da equipe |

## Filtros e segmentação

Cada widget pode ser filtrado por período, pipeline, etapa, usuário responsável ou qualquer propriedade customizada.`,
  },
  {
    slug: "importacao",
    title: "Importação de dados",
    description: "Importe contatos, empresas e negócios via planilha.",
    category: "crm",
    categoryLabel: "CRM",
    icon: "importacao",
    content: `## Importando dados

O Beeno permite importar **Contatos**, **Empresas** e **Negócios** via arquivo CSV ou XLSX.

## Passo a passo

1. Acesse **Configurações → Importação**
2. Selecione o tipo de objeto (Contatos, Empresas ou Negócios)
3. Baixe o **modelo de planilha** para garantir o formato correto
4. Preencha a planilha com seus dados
5. Faça upload do arquivo
6. Mapeie as colunas da planilha para as propriedades do Beeno
7. Revise as incompatibilidades e confirme a importação

## Dicas importantes

- **Telefones**: use o formato internacional sem formatação (ex: \`5511999999999\`)
- **Datas**: use o formato dia/mês/ano
- **Duplicatas**: o sistema detecta duplicatas por e-mail e telefone. Você pode escolher ignorar ou atualizar o registro existente
- **Limite**: até 10.000 registros por importação

## Campos obrigatórios por objeto

| Objeto | Campo obrigatório |
|--------|------------------|
| Contato | Nome ou E-mail |
| Empresa | Nome |
| Negócio | Nome e Pipeline |`,
  },
  {
    slug: "segmentos",
    title: "Segmentos",
    description: "Crie grupos filtrados de contatos para campanhas e automações.",
    category: "marketing",
    categoryLabel: "Marketing",
    icon: "segmento",
    content: `## O que são segmentos

Segmentos são listas dinâmicas de contatos que atendem a critérios específicos. São usados em fluxos de automação, campanhas de e-mail e para direcionar ações estratégicas com base nas informações do CRM.

## Segmentos na interface

1. Acesse **Marketing → Segmentos**
2. Clique em **+ Novo segmento**
3. Defina os filtros (propriedades, comportamentos, datas)
4. Salve. O segmento atualiza dinamicamente conforme os contatos passam a atender (ou deixam de atender) aos critérios

## Casos de uso

- **Leads quentes**: engajaram com 3+ e-mails + visitaram a página de preços
- **Inativos**: sem interação há mais de 90 dias
- **Clientes VIP**: ticket médio acima de R$ 5.000
- **Região específica**: contatos de São Paulo no segmento de saúde`,
  },

  {
    slug: "fluxos-automacao",
    title: "Fluxos de automação",
    description: "Crie sequências automáticas de ações, condições e decisões.",
    category: "automacao",
    categoryLabel: "Automação",
    icon: "automacao",
    content: `## O que são fluxos de automação

Fluxos de automação são sequências de ações executadas automaticamente quando um contato ou negócio atende a certas condições. Permitem nutrir leads, mover negócios de etapa, enviar mensagens, criar tarefas e atualizar dados sem intervenção manual.

## Tipos de fluxo

Ao criar um fluxo, a primeira escolha é o **tipo**, que define qual objeto será inscrito e quais gatilhos de entrada estarão disponíveis.

### Baseado em Contatos
Trabalha com dados do contato inscrito individualmente. Gatilhos disponíveis:
- **Segmentação de contato**: inscreve todos os contatos de um segmento
- **Formulários**: inscreve quem preencheu um formulário específico
- **Inscrição manual**: contatos adicionados um a um
- **Mudança de propriedade**: inscreve quando uma propriedade é atualizada para um valor específico

### Baseado em Negócios
Trabalha com dados da negociação inscrita individualmente. Gatilhos disponíveis:
- **Etapas da pipeline**: inscreve negócios que chegam a uma etapa específica
- **Inscrição manual**: negócios adicionados manualmente
- **Mudança de propriedade**: inscreve quando uma propriedade do negócio é atualizada

> Não é possível misturar dois tipos de gatilho no mesmo fluxo, mas é possível selecionar mais de uma referência dentro do gatilho escolhido (ex.: vários segmentos ao mesmo tempo).

## Como criar um fluxo

1. Acesse **Fluxos de Automação → Criar fluxo** e escolha o tipo (contato ou negócio)
2. Defina o gatilho de inscrição no construtor
3. Monte o fluxograma combinando **Ações**, **Condicionais** e **Decisões**
4. Configure nome, descrição, data de ativação/desativação e se permite reinscrição
5. Ative o fluxo

## Ações disponíveis

Cada ação executa uma tarefa automática; ao concluir, o fluxo segue para o próximo nó conectado.

| Ação | O que faz |
|------|-----------|
| **Ajustar pontos do contato** | Soma ou remove pontos de Lead Score do contato |
| **Alterar etapa do negócio** | Move o negócio para outra etapa, no mesmo funil ou em outro |
| **Alterar etiquetas** | Adiciona ou remove etiquetas do contato/negócio |
| **Atraso** | Pausa o fluxo por um tempo fixo, uma data de calendário ou com base em uma propriedade de data do registro (ex.: lembrete antes de uma reunião) |
| **Clonar registro** | Duplica um negócio para outro funil (ou o mesmo), com opção de sobrescrever propriedades como etapa e pipeline |
| **Copiar valor da propriedade** | Copia o valor de uma propriedade para outra, no mesmo objeto ou entre objetos diferentes (os tipos precisam ser compatíveis) |
| **Criar registro** | Cria automaticamente um novo Contato, Negócio ou Empresa, com associações, etiquetas e propriedades definidas |
| **Criar tarefa** | Gera uma tarefa (To do, Ligação ou E-mail) para um usuário, com prioridade e prazo |
| **Definir valor da propriedade** | Preenche ou atualiza uma propriedade de Contato, Empresa ou Negócio |
| **Enviar e-mail** | Dispara um e-mail do tipo Marketing ou Transacional para o contato |
| **Enviar notificação interna por e-mail** | Avisa usuários internos do CRM (ex.: proprietário do negócio) em vez do lead |
| **Enviar webhook** | Envia uma requisição HTTP (GET, POST, PUT, PATCH ou DELETE) para um sistema externo, com headers e parâmetros customizados |
| **Inscrever em outro fluxo** | Encadeia o registro em outro fluxo de automação já existente |
| **Inserir/remover do segmento** | Adiciona ou remove o contato de um ou mais segmentos dinamicamente |
| **Ir para ação** | Pula para outra ação já existente no mesmo fluxo, sem duplicar passos |
| **Limpar propriedades** | Apaga o valor de uma ou mais propriedades do objeto |
| **Manipular tarefas** | Finaliza ou exclui tarefas pendentes (criadas manual ou automaticamente) vinculadas ao registro |
| **Reativar recebimento de comunicação** | Reabilita um contato marcado como opt-out |
| **Revezar proprietário** | Redistribui automaticamente o proprietário de contatos, negócios ou empresas entre usuários/equipes, de forma igualitária ou por percentual |
| **Suspender recebimento de comunicação** | Bloqueia temporariamente o envio de comunicações para o registro, com motivo registrado |
| **API de conversão** | Envia um evento de conversão para o Meta Pixel (requer Pixel e Evento previamente configurados) |

## Condicionais

Condicionais criam ramificações no fluxo: toda condicional tem uma saída **positiva** (quando o registro atende ao critério) e uma **negativa** (quando não atende). Tipos disponíveis:

- **Campanhas do registro**: valida se o contato já passou por outro fluxo, com opção de filtrar por data
- **Etiquetas do registro**: valida se o objeto principal do fluxo possui determinada etiqueta
- **Possui e-mail válido**: valida a propriedade nativa de e-mail do contato
- **Segmento do contato**: valida se o contato pertence a um ou mais segmentos
- **Validar campo de formulário**: checa a resposta de um contato em um campo específico de formulário (disponível em fluxos de contato)
- **Validar tarefas**: verifica se existem tarefas pendentes (manuais ou automáticas) vinculadas ao registro
- **Valor da propriedade do registro**: compara o valor de uma propriedade de Contato, Negócio ou Empresa (a condicional mais flexível, com múltiplos operadores de comparação)

## Decisões

Diferente das condicionais, decisões se baseiam em **ações que o próprio contato realizou** dentro de uma janela de tempo, muito usadas em cadências de follow-up. Disponíveis apenas em fluxos baseados em contato.

Toda decisão tem saída positiva (a ação ocorreu) e negativa (não ocorreu dentro do prazo configurado). Tipos disponíveis:

- **Baixou o arquivo**: verifica se o contato baixou um arquivo hospedado no Beeno
- **Enviar formulário**: verifica se o contato preencheu um formulário dentro do prazo
- **Visita a uma página**: verifica se o contato visitou uma landing page (ou página externa com rastreio configurado), com opção de validar a origem do acesso (referrer)
- **Decisões de e-mail**: verifica se o contato abriu, clicou ou respondeu a um e-mail enviado anteriormente no mesmo fluxo

> Dica: mantenha janelas de espera curtas no início da cadência e aumente gradualmente para não pressionar demais o contato.

## Alvo de fluxo

O **alvo** é um conjunto de filtros que, quando atendidos por um registro, o remove automaticamente do fluxo, evitando comunicações desnecessárias após o objetivo ter sido alcançado.

Exemplo: se o objetivo do fluxo é agendar uma reunião, o alvo pode ser "Contato agendou reunião **OU** virou cliente". Assim que uma dessas condições acontecer, o contato sai do fluxo.

Configure o alvo na aba **Configurações** do fluxo, combinando grupos **E** (todas as condições precisam ser verdadeiras) e grupos **OU** (basta uma). Se o alvo for atingido enquanto o registro está em uma ação de atraso, ele conclui essa ação antes de ser removido do fluxo.

## Métricas e registros

Acompanhe o desempenho em **Fluxos → [nome do fluxo]**:
- **Estatísticas do fluxo**: evolução diária de contatos/negócios adicionados
- **Mapa das ações**: quantos registros entraram, avançaram, concluíram ou falharam em cada ação
- **Atividade recente**: alterações de configuração e quem as fez, útil para auditoria
- **Análise individual**: abra a lista de registros inscritos e veja, na linha do tempo de cada contato ou negócio, todas as ações do fluxo que já foram executadas`,
  },

  //  MARKETING
  {
    slug: "formularios",
    title: "Formulários",
    description: "Crie formulários para capturar leads integrados ao CRM.",
    category: "marketing",
    categoryLabel: "Marketing",
    icon: "pipeline",
    content: `## O que são formulários

Os formulários nativos do Beeno vão muito além da simples captação de leads: eles criam ou atualizam automaticamente contatos e empresas no CRM, permitindo iniciar de imediato uma cadência de primeiro contato e notificar sua equipe sobre cada nova chegada. Por serem nativos, você mantém controle total sobre o fluxo de dados e evita retrabalho com integrações externas frágeis.

## Criando um formulário

1. Acesse **Marketing → Formulários** e clique em **Criar formulário**
2. Em **Adicionar campo**, escolha entre as opções disponíveis: texto, e-mail (com validação automática), telefone, data, data/hora, arquivo, entre outras
3. Para cada campo, selecione qual propriedade de contato ou empresa ele deve preencher automaticamente. Em campos do tipo lista, as opções da propriedade já aparecem prontas no formulário
4. Na aba **Configurações**, ajuste o comportamento individual de cada campo
5. Na aba **Ações**, defina o que acontece após o envio: disponibilizar um arquivo para download, notificar sua equipe por e-mail, entre outras
6. Na aba **Estilos**, personalize o layout: formato dos campos, espaçamentos, cores e animações

## Integração com webhook

Configure um webhook para ser notificado a cada novo preenchimento, direto em **Configurações** do formulário, informando a URL de destino.

## Rastreamento de UTM

Adicione campos ocultos para capturar automaticamente os parâmetros de campanha (origem, mídia, campanha) da URL de onde o contato veio. Os dados ficam salvos nas propriedades do contato.`,
  },
  {
    slug: "landing-page",
    title: "Landing Pages",
    description: "Crie páginas de captura nativas no Beeno.",
    category: "marketing",
    categoryLabel: "Marketing",
    icon: "lp",
    content: `## Landing Pages no Beeno

As landing pages do Beeno são muito mais que páginas de captura: elas já nascem integradas ao CRM, criando automaticamente contatos, empresas e negócios, além de acionar cadências de primeiro contato e avisar sua equipe sobre cada nova conversão. Por serem publicadas direto da plataforma, você tem controle total do fluxo de dados e evita retrabalho com construtores externos e integrações frágeis.

## Criando uma landing page

1. Acesse **Marketing → Landing Page** e clique em **Criar página**
2. Escolha um modelo na galeria de templates, ou inicie com uma página em branco
3. Edite os blocos (texto, imagem, formulário, CTA)
4. Configure o domínio personalizado
5. Publique

## Conectar domínio personalizado

Para usar seu domínio (ex: oferta.suaempresa.com):
1. Acesse **Configurações → Domínios**
2. Adicione o subdomínio
3. Configure o CNAME no seu provedor de DNS
4. Aguarde a propagação (até 48h)

## Integração com formulários

Toda LP inclui automaticamente um formulário integrado ao CRM. Os leads capturados entram diretamente no pipeline configurado.

## Boas práticas

- Use um título claro e objetivo (benefício principal)
- Inclua **prova social** (depoimentos, logos de clientes)
- CTA visível acima da dobra (sem scroll)
- Formulário com poucos campos (nome + e-mail + telefone é suficiente)
- Versão mobile otimizada`,
  },
  {
    slug: "arquivos",
    title: "Arquivos",
    description: "Centralize e monitore o compartilhamento de documentos.",
    category: "marketing",
    categoryLabel: "Marketing",
    icon: "arquivo",
    content: `## O que são Arquivos

A área de **Arquivos** centraliza documentos digitais relacionados a contatos, negócios e demais registros do CRM. Cada arquivo enviado gera automaticamente um link de download exclusivo e permite acompanhar quantas vezes ele foi baixado.

## Onde usar arquivos

Depois de enviados, os arquivos podem ser reaproveitados em:
- **E-mails**: como anexo ou link em campanhas e comunicados
- **Redirecionamento de formulários**: direcione o contato para download após o envio
- **Landing pages**: disponibilize materiais de apoio, catálogos ou e-books
- **Fluxos de automação**: use a decisão "Baixou o arquivo" para ramificar o fluxo com base no download

## Como enviar um novo arquivo

1. Acesse **Marketing → Arquivos**
2. Clique em **Novo arquivo** e selecione o arquivo a importar
3. Preencha as informações básicas (nome, descrição)
4. Salve. O arquivo precisa estar **ativo** para poder ser utilizado

## Monitorando arquivos existentes

Na listagem de arquivos, abra qualquer item para ver:
- O **link público** de compartilhamento e download
- **Métricas de downloads**
- **Pré-visualização** do conteúdo`,
  },
  {
    slug: "emails",
    title: "E-mails",
    description: "Crie, envie e acompanhe métricas de campanhas de e-mail.",
    category: "marketing",
    categoryLabel: "Marketing",
    icon: "email",
    content: `## O que é a área de E-mails

Reúne tudo que você precisa para criar, automatizar e acompanhar campanhas de e-mail: modelos reutilizáveis, envios automáticos baseados em ações do contato e o histórico completo de entregas, aberturas e cliques.

## Tipos de e-mail

| Tipo | Quando usar |
|------|-------------|
| **E-mail automatizado** | Disparos dentro de fluxos de automação ou envios pontuais na ficha do contato, ideal quando o envio precisa se mesclar com outras ações do fluxo |
| **E-mail regular** | Disparos para um ou mais segmentos, sem gatilhos adicionais, ideal para campanhas pontuais de e-mail marketing |

## Como criar um e-mail

1. Acesse **Marketing → E-mails → Criar e-mail** e escolha o tipo (automatizado ou regular)
2. Escolha um modelo da galeria ou comece do zero
3. Monte o e-mail no editor visual, use **Exibir estrutura** para revisar o esqueleto de linhas e conteúdos, e **Salvar como novo modelo** para reaproveitar o layout depois
4. Na aba **Detalhes**, configure:
   - **Nome e e-mail do remetente** (o domínio precisa estar conectado, veja [Domínios](#))
   - **E-mail para respostas** e **cópia oculta**
   - **Anexos** (arquivos já salvos em [Arquivos](#))
   - **Versão em texto simples**, alternativa para melhorar a entregabilidade
5. Defina os detalhes finais: **assunto**, **nome interno** (aparece na listagem e métricas), **categoria** (ex.: Transacional, Prospecção) e, em e-mails regulares, o **segmento** de destino
6. Escolha entre **enviar agora** ou **agendar** data e horário

## Métricas de envio

Na listagem, cada e-mail mostra a quantidade de enviados, lidos e clicados, clique no número para abrir a lista filtrada de contatos correspondente. Ao abrir um e-mail específico, o detalhamento inclui:

- **Total de tentativas vs. enviados**
- **Aberturas** e **cliques**
- **Rejeições** (bounce, e-mail incorreto ou inexistente)
- **Cancelamentos de assinatura**
- **Falhas de envio** (ex.: domínio com baixa reputação)

> Ao registrar uma rejeição, o contato é automaticamente marcado como desinscrito de novas comunicações.

O **dashboard de Marketing** também reúne essas métricas com filtro por período.`,
  },
  {
    slug: "dominios",
    title: "Domínios",
    description: "Configure domínio próprio para e-mail e landing pages.",
    category: "marketing",
    categoryLabel: "Marketing",
    icon: "dominio",
    content: `## Por que conectar um domínio

Para enviar e-mails com seu próprio domínio (melhorando a entregabilidade) e publicar landing pages personalizadas, é necessário apontar o domínio corretamente dentro do Beeno.

## Como conectar

1. Acesse **Configurações → Domínios** e clique em **Conectar domínio**
2. Escolha o que deseja configurar: **domínio de e-mail** ou **domínio de landing page**
3. Digite o domínio, ele precisa ser próprio, ou seja, você precisa ter acesso aos registros DNS dele

> Nunca use o domínio principal do seu site institucional. Se o site é \`www.suaempresa.com.br\`, não use \`suaempresa.com.br\`, use uma variação como \`lp.suaempresa.com.br\` ou \`mail.suaempresa.com.br\`.

4. O Beeno gera os registros DNS necessários. Acesse o painel do seu provedor (Registro.br, GoDaddy, HostGator etc.) e aponte todos os registros exibidos, sem exceção
5. Depois de apontar, volte ao Beeno e **revalide a conexão**. Quando todos os itens aparecerem em verde, o domínio está conectado

## Depois de conectado

**Para e-mail**: defina o domínio como **domínio primário de envio** e preencha as configurações padrão (nome do remetente, endereço etc.). A partir daí, os disparos saem autenticados pelo seu domínio.

**Para landing pages**: crie as páginas normalmente, ao publicar, elas já ficam disponíveis no domínio configurado.

Se tiver dificuldades no apontamento, consulte a documentação do seu provedor de domínio ou peça apoio ao time técnico responsável pelo DNS.`,
  },
  {
    slug: "anuncios",
    title: "Anúncios",
    description: "Conecte contas de anúncios, veja criativos e sincronize leads.",
    category: "marketing",
    categoryLabel: "Marketing",
    icon: "ads",
    content: `## O que a área de Anúncios oferece

Conecte contas de anúncios do **Meta Ads, Google Ads e LinkedIn Ads** para acompanhar custos, leads e conversões sem sair do CRM, com dashboards prontos e sincronização automática de leads gerados por formulários.

## Conectar uma conta de anúncios

1. Acesse **Marketing → Anúncios → Contas de Anúncios**
2. Escolha a plataforma desejada e siga o pop-up de vínculo, autenticando com um usuário que tenha permissão de administrador na conta de anúncios
3. Após conectado, a conta aparece na listagem com seu status de conexão

## Sincronização de leads de formulários (Meta Ads)

Com a conta conectada, é possível sincronizar formulários **Lead Ads** do Meta diretamente com o CRM:

1. Acesse **Marketing → Anúncios → Sincronização de leads → Criar sincronização**
2. Selecione a conta, a página vinculada e o formulário desejado
3. Mapeie os campos do formulário para as propriedades de contato correspondentes
4. Opcionalmente, defina uma inscrição automática em um fluxo de automação
5. Salve. Novos leads do formulário passam a criar contatos automaticamente no Beeno

> **Leads não estão chegando?** Normalmente é permissão no Meta Business Manager. Acesse **Configurações → Integrações → Acesso a leads** na página vinculada ao formulário, abra a aba **CRMs** e confirme se o Beeno está na lista de CRMs autorizados. Se não estiver, use **Assign CRM** para atribuí-lo. Esse passo precisa ser repetido para cada página com formulários ativos.

## Gerenciador de Anúncios

Acompanhe a performance das campanhas conectadas direto no CRM, em **Marketing → Anúncios**:

- **Filtros**: conta, status e período
- **Resumo de performance**: impressões, cliques, contatos, negócios, valor gasto e ROI
- **Navegação em camadas**: Campanhas → Conjuntos de anúncios → Anúncios, cada nível com métricas de CPC, CPM, CTR, valor gasto, orçamento, contatos e negócios gerados

> A atualização das métricas pode levar até 24 horas, pois depende da sincronização com cada plataforma. Pequenas diferenças em relação ao painel nativo da plataforma são esperadas por conta dessa janela.`,
  },
  {
    slug: "meta-pixel",
    title: "Meta Pixel",
    description: "Conecte o Pixel da Meta e otimize campanhas com eventos de conversão.",
    category: "marketing",
    categoryLabel: "Marketing",
    icon: "pixel",
    content: `## O que é o Meta Pixel

O Pixel da Meta é um trecho de rastreamento usado para medir conversões, criar públicos e otimizar campanhas no Facebook e Instagram. Ao conectá-lo ao Beeno, você combina as métricas de aquisição com os dados de relacionamento do CRM (etapas do funil, origem, oportunidades), permitindo que o algoritmo de anúncios aprenda com sinais de qualidade, não apenas cliques.

## Pré-requisitos

1. Acesso à **Página** do Facebook e à **Conta de Anúncios** onde o Pixel está cadastrado (com permissão de administrador)
2. O Pixel já criado no **Gerenciador de Eventos** da Meta
3. Estar logado com o perfil correto da Meta no navegador

> Se sua empresa usa Business Manager, garanta que Pixel, Página e Conta de Anúncios pertencem ao mesmo Business e que seu usuário tem as permissões necessárias.

## Conectar um Pixel existente

1. Acesse **Configurações → Anúncios → Pixel → Adicionar Pixel**
2. Selecione o usuário/perfil da Meta com acesso à Página e à Conta de Anúncios
3. Após autenticar, escolha o Pixel desejado na listagem e confirme em **Conectar**

O Pixel fica com status **Conectado**, exibindo ID, nome e status. A conexão não altera o site automaticamente. O envio de eventos ocorre a partir de ações no CRM (criação de lead, mudança de etapa, conclusão de compra etc.), configuradas via Eventos.

## Eventos

Eventos informam ao algoritmo da Meta quais ações importam para o seu negócio:

- **Eventos padrão**: pré-definidos pela Meta (ex.: \`Lead\`, \`Purchase\`, \`CompleteRegistration\`), facilitam otimização e comparação de relatórios
- **Eventos personalizados**: criados por você (ex.: \`DemoAgendada\`, \`NegocioGanho\`) para cenários específicos do seu funil

### Como criar um evento

1. Acesse **Configurações → Anúncios → Eventos → Adicionar evento**
2. Preencha: rede de anúncios (Facebook), conta de anúncios, Pixel já conectado e o tipo de conversão (fluxo de automação)
3. Selecione os identificadores de correspondência (ex.: identificador interno, e-mail e telefone)
4. Escolha um evento padrão ou defina o nome de um evento customizado
5. Salve. O evento fica listado com o Pixel e a Conta de Anúncios associados

## Como os eventos são disparados

Os eventos são enviados através da ação **API de conversão**, disponível nos [fluxos de automação](#). Combine gatilhos, condições e outras ações (como atualização de propriedades) para que o evento seja enviado à Meta exatamente no momento certo do funil.`,
  },
  {
    slug: "pontuacao",
    title: "Pontuação (Lead Score)",
    description: "Configure pontuação automática para priorizar leads.",
    category: "marketing",
    categoryLabel: "Marketing",
    icon: "score",
    content: `## O que é Lead Score

O Lead Score é um sistema de pontuação que avalia automaticamente o nível de interesse e qualificação de cada lead, baseado em suas ações e características.

## Como funciona

Cada ação ou característica do lead adiciona ou remove pontos:

| Ação | Pontos |
|------|--------|
| Abriu e-mail | +5 |
| Clicou em link | +10 |
| Visitou página de preços | +20 |
| Preencheu formulário | +30 |
| Trabalha em empresa grande | +15 |
| Cargo de decisor | +25 |
| Inatividade (30 dias) | -10 |

## Configurar gatilhos de pontuação

1. Acesse **Marketing → Pontuação**
2. Clique em **+ Novo gatilho**
3. Selecione o tipo: **Ação** (comportamental) ou **Propriedade** (demográfico)
4. Configure a condição e os pontos

## Criar segmentos por pontuação

Use a pontuação como filtro na criação de um segmento (por exemplo, "pontuação maior ou igual a 50") para reunir automaticamente os leads mais qualificados. Veja o artigo de Segmentos para o passo a passo.

## Fluxo baseado em pontuação

Configure um fluxo de automação disparado quando o lead atinge X pontos:
- Score ≥ 30: enviar e-mail de nurturing
- Score ≥ 60: criar tarefa para vendedor ligar
- Score ≥ 90: mover para etapa "Qualificado"`,
  },

  //  INTEGRAÇÕES
  {
    slug: "associacoes",
    title: "Associações",
    description: "Vincule objetos entre si no CRM.",
    category: "integracoes",
    categoryLabel: "Integrações",
    icon: "link",
    content: `## O que são associações

Associações conectam objetos do CRM entre si, por exemplo, vincular um contato a um negócio, ou uma empresa a um contato.

## Tipos suportados

| De | Para |
|----|------|
| Contato | Negócio |
| Contato | Empresa |
| Negócio | Contato |
| Negócio | Empresa |
| Negócio | Produto |
| Empresa | Contato |

>  Produtos só podem ser associados a Negócios (não diretamente a Contatos ou Empresas).

## Como associar na interface

Na maioria dos casos, você não precisa de uma tela dedicada para associações, elas acontecem no próprio cadastro do registro:

- Ao criar ou editar um **negócio**, associe contatos, empresas e produtos diretamente nos campos de associação
- Ao abrir um **contato**, use o botão **+ Associar** para vincular a uma empresa ou negócio existente
- Ao abrir uma **empresa**, use **+ Associar contato** para vincular pessoas a ela

## Removendo uma associação

Abra o registro, localize o item associado na seção correspondente e clique no ícone de remover ao lado dele. A remoção da associação não apaga nenhum dos dois registros.`,
  },
  {
    slug: "webhooks",
    title: "Webhooks e Integrações",
    description:
      "Configure webhooks e chaves de integração para conectar o Beeno a outras ferramentas.",
    category: "integracoes",
    categoryLabel: "Integrações",
    icon: "integracao",
    content: `## Webhooks

Webhooks enviam notificações automáticas para uma URL externa quando eventos ocorrem no Beeno.

## Configurar webhook

1. Acesse **Configurações → Integrações → Webhooks**
2. Clique em **+ Novo webhook**
3. Informe a URL de destino
4. Selecione os eventos a monitorar
5. Ative o webhook

## Eventos disponíveis

| Evento | Descrição |
|--------|-----------|
| Contato criado | Um novo contato foi criado |
| Contato atualizado | Um contato existente foi atualizado |
| Negócio criado | Um novo negócio foi criado |
| Negócio mudou de etapa | Um negócio avançou ou retrocedeu no funil |
| Negócio atualizado | Um negócio existente foi atualizado |
| Formulário preenchido | Um formulário do Beeno foi enviado |

Cada notificação enviada ao seu sistema inclui o tipo de evento e os dados do registro correspondente (por exemplo, nome e e-mail de um contato recém-criado).

## Chaves de integração

Para conectar o Beeno a outra ferramenta (como o N8N ou outro sistema do seu time técnico), gere uma chave de acesso dedicada:

1. Acesse **Configurações → Integrações → Chaves de integração**
2. Clique em **+ Gerar chave**
3. Dê um nome descritivo para saber depois onde ela é usada (ex.: "Integração com o site")
4. Copie e guarde a chave em um local seguro, ela não será exibida novamente

>  Revogue chaves que não são mais utilizadas, e use uma chave própria para cada integração. Se tiver dúvidas técnicas sobre como usar uma chave em um sistema específico, fale com o time responsável pela integração.`,
  },
];

export const categories: Category[] = [
  {
    key: "primeiros-passos",
    label: "Primeiros passos",
    items: articles
      .filter((a) => a.category === "primeiros-passos")
      .map((a) => ({ slug: a.slug, title: a.title })),
  },
  {
    key: "conta-configuracao",
    label: "Conta e Configuração",
    items: articles
      .filter((a) => a.category === "conta-configuracao")
      .map((a) => ({ slug: a.slug, title: a.title })),
  },
  {
    key: "crm",
    label: "CRM",
    items: articles
      .filter((a) => a.category === "crm")
      .map((a) => ({ slug: a.slug, title: a.title })),
  },
  {
    key: "automacao",
    label: "Automação",
    items: articles
      .filter((a) => a.category === "automacao")
      .map((a) => ({ slug: a.slug, title: a.title })),
  },
  {
    key: "marketing",
    label: "Marketing",
    items: articles
      .filter((a) => a.category === "marketing")
      .map((a) => ({ slug: a.slug, title: a.title })),
  },
  {
    key: "integracoes",
    label: "Integrações",
    items: articles
      .filter((a) => a.category === "integracoes")
      .map((a) => ({ slug: a.slug, title: a.title })),
  },
];

export const homeCards = [
  {
    icon: "rocket",
    title: "Primeiros passos",
    description: "Configure sua conta e explore o CRM",
    slug: "visao-geral",
  },
  {
    icon: "pipeline",
    title: "Pipelines e funis",
    description: "Crie e personalize seus pipelines de vendas",
    slug: "pipelines",
  },
  {
    icon: "contacts",
    title: "Contatos",
    description: "Gerencie leads e clientes no CRM",
    slug: "contatos",
  },
  {
    icon: "deals",
    title: "Negócios",
    description: "Acompanhe oportunidades de venda",
    slug: "negocios",
  },
  {
    icon: "automation",
    title: "Automações",
    description: "Fluxos automáticos para sua operação",
    slug: "fluxos-automacao",
  },
  {
    icon: "link",
    title: "Webhooks e Integrações",
    description: "Conecte o Beeno a outras ferramentas",
    slug: "webhooks",
  },
];
