// Dados mockados para o modo demonstração público (/demo/*). NÃO toca no banco.
export const demoCompany = { nome: "Padaria do Bairro", primary_color: "#22C55E" };

export type DemoMsg = {
  id: string; numero: string; nome: string;
  direcao: "entrada" | "saida"; autor: "ia" | "humano" | "contato";
  texto: string; quando: Date;
};

// Timestamp FIXO para evitar hydration mismatch entre SSR e client.
// Datas relativas a esse ponto mantêm os textos "há X min" estáveis no demo.
const NOW = new Date("2026-06-16T14:30:00.000Z").getTime();
const m = (min: number) => new Date(NOW - min * 60000);

const seedContatos = [
  { numero: "5511987651001", nome: "Maria Silva" },
  { numero: "5511987651002", nome: "João Pereira" },
  { numero: "5521987651003", nome: "Ana Lúcia" },
  { numero: "5531987651004", nome: "Carlos Mendes" },
  { numero: "5541987651005", nome: "Beatriz Souza" },
  { numero: "5511987651006", nome: "Rafael Lima" },
  { numero: "5511987651007", nome: "Patrícia Rocha" },
];

export const demoMensagens: DemoMsg[] = [
  // Maria — conversa quente
  { id: "1", numero: seedContatos[0].numero, nome: seedContatos[0].nome, direcao: "entrada", autor: "contato", texto: "Oi! Vocês entregam na Vila Mariana?", quando: m(45) },
  { id: "2", numero: seedContatos[0].numero, nome: seedContatos[0].nome, direcao: "saida", autor: "ia", texto: "Oi, Maria! 👋 Entregamos sim em toda Vila Mariana. Quer ver o cardápio?", quando: m(44) },
  { id: "3", numero: seedContatos[0].numero, nome: seedContatos[0].nome, direcao: "entrada", autor: "contato", texto: "Quero! Quanto é o pão de queijo?", quando: m(40) },
  { id: "4", numero: seedContatos[0].numero, nome: seedContatos[0].nome, direcao: "saida", autor: "ia", texto: "Pão de queijo R$ 18,00 (500g). Posso anotar quantos?", quando: m(39) },
  { id: "5", numero: seedContatos[0].numero, nome: seedContatos[0].nome, direcao: "entrada", autor: "contato", texto: "Pode mandar 1kg, fechado!", quando: m(10) },
  // João — fechou
  { id: "6", numero: seedContatos[1].numero, nome: seedContatos[1].nome, direcao: "entrada", autor: "contato", texto: "Bom dia, quero fazer um pedido grande pro escritório.", quando: m(180) },
  { id: "7", numero: seedContatos[1].numero, nome: seedContatos[1].nome, direcao: "saida", autor: "ia", texto: "Bom dia, João! Que ótimo. Pra quantas pessoas?", quando: m(178) },
  { id: "8", numero: seedContatos[1].numero, nome: seedContatos[1].nome, direcao: "entrada", autor: "contato", texto: "Uns 30. Já podem confirmar pra amanhã 9h?", quando: m(170) },
  { id: "9", numero: seedContatos[1].numero, nome: seedContatos[1].nome, direcao: "saida", autor: "humano", texto: "Confirmadíssimo. Estará pronto às 9h. Obrigada!", quando: m(160) },
  // Ana — pensando
  { id: "10", numero: seedContatos[2].numero, nome: seedContatos[2].nome, direcao: "entrada", autor: "contato", texto: "Oi, qual o horário de funcionamento?", quando: m(300) },
  { id: "11", numero: seedContatos[2].numero, nome: seedContatos[2].nome, direcao: "saida", autor: "ia", texto: "Olá, Ana! De seg a sáb, das 6h às 20h. 🥐", quando: m(298) },
  { id: "12", numero: seedContatos[2].numero, nome: seedContatos[2].nome, direcao: "entrada", autor: "contato", texto: "Obrigada! Vou pensar e te aviso.", quando: m(290) },
  // Carlos — perda
  { id: "13", numero: seedContatos[3].numero, nome: seedContatos[3].nome, direcao: "entrada", autor: "contato", texto: "Vocês têm bolo vegano?", quando: m(1440) },
  { id: "14", numero: seedContatos[3].numero, nome: seedContatos[3].nome, direcao: "saida", autor: "ia", texto: "Hoje ainda não, Carlos. Estamos avaliando incluir!", quando: m(1438) },
  { id: "15", numero: seedContatos[3].numero, nome: seedContatos[3].nome, direcao: "entrada", autor: "contato", texto: "Ah que pena, valeu.", quando: m(1430) },
  // Beatriz — negociando
  { id: "16", numero: seedContatos[4].numero, nome: seedContatos[4].nome, direcao: "entrada", autor: "contato", texto: "Faço um pedido recorrente toda terça. Tem desconto?", quando: m(120) },
  { id: "17", numero: seedContatos[4].numero, nome: seedContatos[4].nome, direcao: "saida", autor: "ia", texto: "Tem sim! 10% pra clientes fixos. Quer formalizar?", quando: m(118) },
  { id: "18", numero: seedContatos[4].numero, nome: seedContatos[4].nome, direcao: "entrada", autor: "contato", texto: "Quero, me passa as condições.", quando: m(60) },
  // Rafael
  { id: "19", numero: seedContatos[5].numero, nome: seedContatos[5].nome, direcao: "entrada", autor: "contato", texto: "Aceita Pix?", quando: m(25) },
  { id: "20", numero: seedContatos[5].numero, nome: seedContatos[5].nome, direcao: "saida", autor: "ia", texto: "Aceitamos sim! Pix, cartão e dinheiro. 💳", quando: m(24) },
  // Patrícia
  { id: "21", numero: seedContatos[6].numero, nome: seedContatos[6].nome, direcao: "entrada", autor: "contato", texto: "Vocês fazem encomenda de aniversário?", quando: m(15) },
];

export type DemoCard = {
  id: string; numero: string; nome: string;
  status: "conversas" | "negociando" | "ganho" | "perda";
  ultima_mensagem: string; ultima_em: Date;
  valor?: number; observacao?: string;
};

export const demoCards: DemoCard[] = [
  { id: "c1", numero: seedContatos[0].numero, nome: seedContatos[0].nome, status: "negociando", ultima_mensagem: "Pode mandar 1kg, fechado!", ultima_em: m(10), valor: 36, observacao: "Cliente recorrente da Vila Mariana." },
  { id: "c2", numero: seedContatos[1].numero, nome: seedContatos[1].nome, status: "ganho", ultima_mensagem: "Confirmadíssimo. Estará pronto às 9h.", ultima_em: m(160), valor: 480, observacao: "Pedido corporativo para 30 pessoas." },
  { id: "c3", numero: seedContatos[2].numero, nome: seedContatos[2].nome, status: "conversas", ultima_mensagem: "Vou pensar e te aviso.", ultima_em: m(290) },
  { id: "c4", numero: seedContatos[3].numero, nome: seedContatos[3].nome, status: "perda", ultima_mensagem: "Ah que pena, valeu.", ultima_em: m(1430), observacao: "Procurava bolo vegano (não temos)." },
  { id: "c5", numero: seedContatos[4].numero, nome: seedContatos[4].nome, status: "negociando", ultima_mensagem: "Quero, me passa as condições.", ultima_em: m(60), valor: 220, observacao: "Pedido recorrente toda terça — 10% desconto." },
  { id: "c6", numero: seedContatos[5].numero, nome: seedContatos[5].nome, status: "conversas", ultima_mensagem: "Aceita Pix?", ultima_em: m(25) },
  { id: "c7", numero: seedContatos[6].numero, nome: seedContatos[6].nome, status: "conversas", ultima_mensagem: "Vocês fazem encomenda de aniversário?", ultima_em: m(15) },
];

export const demoStats = {
  conversas: demoCards.filter((c) => c.status === "conversas").length,
  negociando: demoCards.filter((c) => c.status === "negociando").length,
  ganho: demoCards.filter((c) => c.status === "ganho").length,
  perda: demoCards.filter((c) => c.status === "perda").length,
};

export const demoAgentConfig = {
  nome_agente: "Pão (assistente da Padaria)",
  nome_empresa: "Padaria do Bairro",
  papel_objetivo: "Atender clientes do WhatsApp, tirar dúvidas de cardápio, anotar pedidos e fechar vendas.",
  estilo_comunicacao: "Acolhedor, simpático e direto. Usa emojis com moderação.",
  sobre_empresa: "Padaria de bairro fundada em 1998. Atende Vila Mariana e Vila Clementino. Entrega via Loggi.",
  produtos_servicos: "Pães, doces, bolos sob encomenda, salgados, café e cestas de café da manhã.",
  pode_fazer: "Mostrar cardápio, informar preços, confirmar entrega, anotar pedidos pequenos.",
  nao_pode_fazer: "Não dá descontos sem autorização, não promete prazo fora da rota da Loggi, não fala mal de concorrentes.",
  telefone_transferencia: "+55 11 99999-0000",
  palavra_pausar: "/pausar",
  palavra_despausar: "/despausar",
};
