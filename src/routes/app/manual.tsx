import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { brand } from "@/config/brand";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/app/manual")({
  head: () => ({ meta: [{ title: `${brand.name} — Manual` }] }),
  beforeLoad: ({ context }: any) => {
    const r = context?.membership?.role;
    const isSuperAdmin = context?.isSuperAdmin;
    if (!isSuperAdmin && r !== "admin") throw redirect({ to: "/app/dashboard" });
  },
  component: ManualPage,
});

type Section =
  | "home"
  | "primeiros-passos"
  | "conversas"
  | "copiloto"
  | "whatsapp"
  | "agente-ia"
  | "supervisao"
  | "relatorios"
  | "equipe"
  | "planos"
  | "faq";

const navSections = [
  {
    label: "Início",
    items: [
      { id: "home" as Section, label: "Visão Geral", icon: "🏠" },
      { id: "primeiros-passos" as Section, label: "Primeiros Passos", icon: "🚀" },
    ],
  },
  {
    label: "Atendimento",
    items: [
      { id: "conversas" as Section, label: "Conversas (Kanban)", icon: "💬" },
      { id: "copiloto" as Section, label: "Copiloto IA", icon: "✨" },
      { id: "whatsapp" as Section, label: "WhatsApp", icon: "📱" },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { id: "agente-ia" as Section, label: "Agente IA Automático", icon: "🤖" },
      { id: "supervisao" as Section, label: "Painel de Supervisão", icon: "📊" },
      { id: "relatorios" as Section, label: "Relatórios", icon: "📈" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { id: "equipe" as Section, label: "Equipe e Funções", icon: "👥" },
      { id: "planos" as Section, label: "Planos e Limites", icon: "💳" },
      { id: "faq" as Section, label: "Perguntas Frequentes", icon: "❓" },
    ],
  },
];

export default function ManualPage() {
  const [active, setActive] = useState<Section>("home");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-muted/30 flex flex-col gap-0 py-6 sticky top-0 h-screen overflow-y-auto">
        <div className="px-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="font-bold text-base text-primary">{brand.name}</span>
          </div>
          <p className="text-xs text-muted-foreground pl-7">Manual do Usuário</p>
        </div>
        {navSections.map((sec) => (
          <div key={sec.label} className="px-2 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-1">
              {sec.label}
            </p>
            {sec.items.map((item) => (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  active === item.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 px-10 py-10 max-w-3xl">
        {active === "home" && <SectionHome onNav={setActive} />}
        {active === "primeiros-passos" && <SectionPrimeirosPassos />}
        {active === "conversas" && <SectionConversas />}
        {active === "copiloto" && <SectionCopiloto />}
        {active === "whatsapp" && <SectionWhatsapp />}
        {active === "agente-ia" && <SectionAgenteIa />}
        {active === "supervisao" && <SectionSupervisao />}
        {active === "relatorios" && <SectionRelatorios />}
        {active === "equipe" && <SectionEquipe />}
        {active === "planos" && <SectionPlanos />}
        {active === "faq" && <SectionFaq />}
      </main>
    </div>
  );
}

/* ── Shared Components ── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-widest uppercase text-primary mb-2">{children}</p>
  );
}

function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-3">{children}</h1>
  );
}

function PageDesc({ children }: { children: React.ReactNode }) {
  return <p className="text-base text-muted-foreground mb-8 max-w-xl">{children}</p>;
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-foreground mt-9 mb-3 border-b border-border pb-2">
      {children}
    </h2>
  );
}

function Callout({
  type,
  icon,
  children,
}: {
  type: "info" | "success" | "warning" | "danger";
  icon: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-50 border-blue-400 text-blue-900 dark:bg-blue-950/40 dark:border-blue-600 dark:text-blue-100",
    success:
      "bg-green-50 border-green-400 text-green-900 dark:bg-green-950/40 dark:border-green-600 dark:text-green-100",
    warning:
      "bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-950/40 dark:border-amber-600 dark:text-amber-100",
    danger:
      "bg-red-50 border-red-400 text-red-900 dark:bg-red-950/40 dark:border-red-600 dark:text-red-100",
  };
  return (
    <div className={`flex gap-3 rounded-lg border-l-4 px-4 py-3 my-4 text-sm ${styles[type]}`}>
      <span className="text-lg shrink-0">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

function Steps({ items }: { items: { title: string; desc: string }[] }) {
  return (
    <div className="flex flex-col gap-0 my-4">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4 relative">
          {i < items.length - 1 && (
            <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
          )}
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shrink-0 z-10">
            {i + 1}
          </div>
          <div className="pb-6 pt-1">
            <p className="font-bold text-sm text-foreground mb-1">{item.title}</p>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border my-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-4 py-2.5"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-foreground align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardGrid({ items }: { items: { icon: string; title: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 my-4">
      {items.map((c) => (
        <div key={c.title} className="rounded-xl border border-border bg-card p-4">
          <span className="text-2xl block mb-2">{c.icon}</span>
          <p className="font-bold text-sm text-foreground mb-1">{c.title}</p>
          <p className="text-xs text-muted-foreground">{c.desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Sections ── */

function SectionHome({ onNav }: { onNav: (s: Section) => void }) {
  const toc: { id: Section; icon: string; title: string; desc: string }[] = [
    { id: "primeiros-passos", icon: "🚀", title: "Primeiros Passos", desc: "Conectar o WhatsApp e configurar a conta" },
    { id: "conversas", icon: "💬", title: "Conversas", desc: "Como usar o kanban e gerenciar atendimentos" },
    { id: "agente-ia", icon: "🤖", title: "Agente IA", desc: "Configurar respostas automáticas com IA" },
    { id: "copiloto", icon: "✨", title: "Copiloto IA", desc: "Sugestões de resposta em tempo real" },
    { id: "supervisao", icon: "📊", title: "Supervisão", desc: "Painel de controle para gestores" },
    { id: "relatorios", icon: "📈", title: "Relatórios", desc: "NPS, TMA, produtividade da equipe" },
  ];
  return (
    <div>
      <Eyebrow>Documentação Oficial</Eyebrow>
      <PageTitle>Bem-vindo ao {brand.name}</PageTitle>
      <PageDesc>
        Plataforma de atendimento inteligente via WhatsApp com IA integrada, CRM visual e painel
        de supervisão em tempo real. Este manual cobre tudo que você precisa para começar e
        dominar o sistema.
      </PageDesc>
      <CardGrid
        items={[
          { icon: "💬", title: "Atendimento via WhatsApp", desc: "Gerencie todas as conversas em um único painel." },
          { icon: "🤖", title: "IA que responde sozinha", desc: "Configure um agente que atende clientes automaticamente, 24h." },
          { icon: "📋", title: "CRM em Kanban", desc: "Visualize o funil de vendas e mova leads entre etapas." },
          { icon: "📊", title: "Relatórios e Supervisão", desc: "Acompanhe NPS, TMA e carga por atendente em tempo real." },
        ]}
      />
      <H2>Navegar pelo manual</H2>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {toc.map((item) => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="font-bold text-sm text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionPrimeirosPassos() {
  return (
    <div>
      <Eyebrow>Começando</Eyebrow>
      <PageTitle>Primeiros Passos</PageTitle>
      <PageDesc>Do cadastro até o primeiro atendimento em menos de 10 minutos.</PageDesc>
      <H2>1. Criar sua conta</H2>
      <Steps
        items={[
          { title: "Acesse o sistema", desc: "Entre no sistema e clique em Criar conta. Preencha nome, e-mail e senha." },
          { title: "Configure sua empresa", desc: "No onboarding, informe o nome da empresa. Isso cria o ambiente isolado para o seu negócio." },
          { title: "Conecte o WhatsApp", desc: "Vá em Configurações → WhatsApp, clique em Conectar e escaneie o QR Code com o celular." },
          { title: "Pronto — as mensagens chegam automaticamente", desc: "Assim que conectado, todas as novas mensagens do WhatsApp aparecem no painel de Conversas em tempo real." },
        ]}
      />
      <Callout type="info" icon="ℹ️">
        O WhatsApp precisa permanecer conectado à internet no celular para que a integração
        funcione. Não é necessário manter o app aberto, mas o telefone não pode ficar sem
        bateria ou sinal por longos períodos.
      </Callout>
      <H2>2. Configurar o Agente IA (opcional)</H2>
      <p className="text-sm text-muted-foreground">
        Se quiser que a IA responda automaticamente os clientes, acesse{" "}
        <strong className="text-foreground">Configurações → Agente IA Avançado</strong> e defina
        o prompt com as informações do seu negócio — horários, produtos, preços, tom de voz.
      </p>
      <H2>3. Convidar a equipe</H2>
      <p className="text-sm text-muted-foreground">
        Acesse <strong className="text-foreground">Configurações → Equipe</strong> para convidar
        atendentes. Cada membro acessa com seu próprio login.
      </p>
    </div>
  );
}

function SectionConversas() {
  return (
    <div>
      <Eyebrow>Atendimento</Eyebrow>
      <PageTitle>Conversas — Painel Kanban</PageTitle>
      <PageDesc>Todas as conversas do WhatsApp organizadas em colunas visuais, como um quadro de tarefas.</PageDesc>
      <H2>Como funciona o Kanban</H2>
      <p className="text-sm text-muted-foreground mb-4">
        Cada conversa vira um <strong className="text-foreground">card</strong> que pode ser movido
        entre colunas conforme o status do atendimento. As colunas representam as etapas do seu funil.
      </p>
      <H2>Ações nos cards</H2>
      <Table
        headers={["Ação", "Como fazer", "Resultado"]}
        rows={[
          ["Mover de etapa", "Arraste o card para outra coluna", "Atualiza o status do lead no CRM"],
          ["Pausar IA", "No chat, clique no ícone de robô (fica vermelho)", "A IA para de responder; atendente assume"],
          ["Reativar IA", "Clique novamente no ícone de robô", "IA volta a responder automaticamente"],
          ["Adicionar observação", "Abra o card e edite o campo de notas", "Visível para toda a equipe"],
          ["Ver histórico completo", "Role para cima no chat", "Todas as mensagens desde o início"],
        ]}
      />
      <Callout type="success" icon="💡">
        <strong>Dica:</strong> Quando você envia uma mensagem manualmente, o sistema
        automaticamente pausa a IA para aquele contato, evitando respostas duplicadas.
      </Callout>
    </div>
  );
}

function SectionCopiloto() {
  return (
    <div>
      <Eyebrow>IA em tempo real</Eyebrow>
      <PageTitle>Copiloto IA</PageTitle>
      <PageDesc>Sugestão inteligente de resposta enquanto você atende — sem sair da conversa.</PageDesc>
      <CardGrid
        items={[
          { icon: "⚡", title: "Resposta em segundos", desc: "A sugestão aparece em 2–3 segundos após clicar no botão." },
          { icon: "🎯", title: "Contextualizado", desc: "Considera as últimas 30 mensagens e o perfil do lead." },
          { icon: "✏️", title: "Editável", desc: "Aceite com um clique ou edite antes de enviar." },
          { icon: "🔒", title: "Humano decide", desc: "A sugestão nunca é enviada automaticamente — você aprova." },
        ]}
      />
      <H2>Como usar</H2>
      <Steps
        items={[
          { title: "Abra a conversa", desc: "Clique no card do cliente que deseja atender." },
          { title: "Clique no botão de varinha (✨)", desc: "Fica ao lado do botão de enviar, na área de digitação. Pode também começar a digitar para o Copiloto completar a ideia." },
          { title: "A sugestão aparece no balão acima da caixa de texto", desc: "Leia a sugestão. Se gostar, clique em Usar — o texto vai para a caixa de digitação, pronto para enviar." },
          { title: "Edite se necessário e envie", desc: "Faça ajustes no texto e pressione Enter ou clique em Enviar." },
        ]}
      />
      <Callout type="warning" icon="⚠️">
        O Copiloto é um auxiliar — sempre revise a sugestão antes de enviar, especialmente com
        informações de preço ou prazo específicos que a IA pode não saber.
      </Callout>
    </div>
  );
}

function SectionWhatsapp() {
  return (
    <div>
      <Eyebrow>Integração</Eyebrow>
      <PageTitle>WhatsApp</PageTitle>
      <PageDesc>Como conectar, reconectar e entender as limitações da integração.</PageDesc>
      <H2>Conectar o WhatsApp</H2>
      <Steps
        items={[
          { title: "Acesse Configurações → WhatsApp", desc: "No menu lateral, clique em Configurações e depois na aba WhatsApp." },
          { title: 'Clique em "Conectar WhatsApp"', desc: "Um QR Code será gerado. Ele expira em ~60 segundos." },
          { title: "Escaneie com o celular", desc: "Abra o WhatsApp no celular → Menu (⋮) → Aparelhos conectados → Conectar um aparelho. Aponte a câmera para o QR." },
          { title: 'Status muda para "Conectado"', desc: "O número de telefone aparecerá na tela de configuração. Pronto!" },
        ]}
      />
      <Callout type="danger" icon="🚫">
        <strong>Importante:</strong> Use apenas números de WhatsApp que não sejam o seu
        WhatsApp pessoal principal. Recomendamos usar um chip dedicado ao negócio.
      </Callout>
      <H2>Limitações do WhatsApp</H2>
      <Table
        headers={["Situação", "O que acontece"]}
        rows={[
          ["Cliente não mandou mensagem há +24h", "Não é possível enviar mensagens — limitação do WhatsApp"],
          ["Muitas mensagens enviadas em sequência", "O sistema pausa envios por alguns minutos (proteção do número)"],
          ["Celular sem bateria ou internet", "Mensagens ficam enfileiradas até reconectar"],
        ]}
      />
    </div>
  );
}

function SectionAgenteIa() {
  return (
    <div>
      <Eyebrow>Automação</Eyebrow>
      <PageTitle>Agente IA Automático</PageTitle>
      <PageDesc>Configure uma IA que responde clientes sozinha, 24h por dia, com a personalidade e o conhecimento do seu negócio.</PageDesc>
      <H2>Como configurar</H2>
      <p className="text-sm text-muted-foreground mb-2">
        Acesse <strong className="text-foreground">Configurações → Agente IA Avançado</strong>. Os campos principais são:
      </p>
      <Table
        headers={["Campo", "O que colocar"]}
        rows={[
          ["Nome do agente", 'Ex: "Beatriz", "Assistente da Clínica X". Aparece para o cliente.'],
          ["Prompt do sistema", "Descrição do negócio, produtos, preços, horários, tom de voz, o que a IA pode ou não falar."],
          ["Provedor de IA", "Gemini (incluso), OpenAI (chave própria) ou Anthropic (chave própria)"],
          ["Modelo", "Gemini 2.0 Flash (padrão) é rápido e eficiente para a maioria dos casos."],
          ["Responder em partes", "Quando ativado, a IA envia múltiplas mensagens curtas em vez de uma mensagem longa."],
        ]}
      />
      <H2>Exemplo de prompt eficiente</H2>
      <Callout type="info" icon="📝">
        <strong>Exemplo para uma barbearia:</strong>
        <br />
        <br />
        Você é Ana, atendente virtual da Barbearia do João. Somos uma barbearia masculina em São Paulo (Vila Madalena). Horário: Ter–Sáb, 9h–19h. Serviços: Corte R$45, Barba R$35, Combo R$70. Agendamentos pelo WhatsApp ou presencial. Seja cordial, objetivo e use linguagem casual. Nunca prometa horários sem confirmar disponibilidade comigo (diga que vai verificar). Se o cliente perguntar sobre algo fora da barbearia, redirecione gentilmente.
      </Callout>
      <H2>Testando o agente</H2>
      <p className="text-sm text-muted-foreground">
        Na mesma tela de configuração, há um campo para testar a resposta. Digite uma mensagem
        simulando um cliente e veja o que a IA responderia antes de ativar.
      </p>
      <Callout type="success" icon="💡">
        <strong>Estratégia recomendada:</strong> Deixe a IA ativa para fazer o primeiro
        atendimento e triagem. Quando o cliente precisar de atendimento humano, o atendente
        assume a conversa manualmente.
      </Callout>
    </div>
  );
}

function SectionSupervisao() {
  return (
    <div>
      <Eyebrow>Gestão em Tempo Real</Eyebrow>
      <PageTitle>Painel de Supervisão</PageTitle>
      <PageDesc>Visão em tempo real de toda a equipe, filas de atendimento e carga de trabalho.</PageDesc>
      <Callout type="warning" icon="🔒">
        O Painel de Supervisão é visível apenas para usuários com perfil{" "}
        <strong>Admin</strong> ou <strong>Supervisor</strong>. Atendentes não têm acesso.
      </Callout>
      <H2>Indicadores principais (KPIs)</H2>
      <CardGrid
        items={[
          { icon: "🟢", title: "Atendentes Online", desc: "Quantos atendentes estão ativos no sistema agora (últimos 5 minutos)." },
          { icon: "💬", title: "Conversas Abertas", desc: "Total de conversas em andamento em toda a empresa." },
          { icon: "⏳", title: "Aguardando", desc: "Conversas sem resposta na fila de espera." },
          { icon: "⚖️", title: "Carga Média", desc: "Média de conversas abertas por atendente online." },
        ]}
      />
      <H2>Cards de atendentes</H2>
      <p className="text-sm text-muted-foreground mb-2">Para cada membro da equipe, o painel mostra:</p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        <li><strong className="text-foreground">Status online</strong> — ponto verde (ativo) ou cinza (offline)</li>
        <li><strong className="text-foreground">Último acesso</strong> — "há 2 minutos", "há 1 hora"</li>
        <li><strong className="text-foreground">Conversas abertas</strong> — número de atendimentos ativos</li>
        <li><strong className="text-foreground">Espera mais longa</strong> — fica vermelho se maior que 30 min</li>
      </ul>
      <H2>Atualização automática</H2>
      <p className="text-sm text-muted-foreground">
        O painel atualiza a cada <strong className="text-foreground">30 segundos</strong>{" "}
        automaticamente, com atualização em tempo real via Supabase Realtime para eventos críticos.
      </p>
    </div>
  );
}

function SectionRelatorios() {
  return (
    <div>
      <Eyebrow>Análise</Eyebrow>
      <PageTitle>Relatórios</PageTitle>
      <PageDesc>Indicadores de desempenho do atendimento, satisfação dos clientes e produtividade da equipe.</PageDesc>
      <H2>NPS — Net Promoter Score</H2>
      <p className="text-sm text-muted-foreground mb-3">
        Mede a satisfação e lealdade dos clientes. Calculado com base nas avaliações recebidas após o atendimento.
      </p>
      <Table
        headers={["Classificação", "Nota", "Significado"]}
        rows={[
          [<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Promotores</span>, "9–10", "Clientes satisfeitos que indicam"],
          [<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Neutros</span>, "7–8", "Satisfeitos, mas não entusiastas"],
          [<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Detratores</span>, "0–6", "Insatisfeitos, podem prejudicar a imagem"],
        ]}
      />
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">Fórmula:</strong> NPS = % Promotores − % Detratores.
        Valores acima de 50 são excelentes.
      </p>
      <H2>TMA — Tempo Médio de Atendimento</H2>
      <p className="text-sm text-muted-foreground">
        Mostra quanto tempo, em média, cada atendente demora para resolver um atendimento. A
        tabela de TMA lista cada atendente com seu tempo médio, conversas encerradas no período
        e nota de satisfação.
      </p>
      <H2>Exportar dados</H2>
      <p className="text-sm text-muted-foreground">
        Clique em <strong className="text-foreground">Exportar CSV</strong> para baixar os dados
        em planilha. Compatível com Excel e Google Sheets.
      </p>
    </div>
  );
}

function SectionEquipe() {
  return (
    <div>
      <Eyebrow>Gestão de Pessoas</Eyebrow>
      <PageTitle>Equipe e Funções</PageTitle>
      <PageDesc>Como convidar membros, definir permissões e organizar quem atende o quê.</PageDesc>
      <H2>Perfis de usuário</H2>
      <Table
        headers={["Perfil", "O que pode fazer"]}
        rows={[
          [<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Admin</span>, "Acesso total: configurações, equipe, relatórios, supervisão, faturamento"],
          [<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Supervisor</span>, "Painel de supervisão, relatórios, conversas de toda equipe — mas não altera configurações"],
          [<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Atendente</span>, "Apenas conversas atribuídas e envio de mensagens. Sem acesso a configurações ou supervisão"],
        ]}
      />
      <H2>Convidar um atendente</H2>
      <Steps
        items={[
          { title: "Acesse Configurações → Equipe", desc: "Clique em Convidar membro." },
          { title: "Informe o e-mail e o perfil", desc: "Escolha entre Atendente, Supervisor ou Admin." },
          { title: "O membro recebe um e-mail de convite", desc: "Ele cria a própria senha e acessa o sistema com a conta vinculada à sua empresa." },
        ]}
      />
    </div>
  );
}

function SectionPlanos() {
  return (
    <div>
      <Eyebrow>Faturamento</Eyebrow>
      <PageTitle>Planos e Limites</PageTitle>
      <PageDesc>Entenda o que está incluso em cada plano e como a cobrança funciona.</PageDesc>
      <H2>Planos disponíveis</H2>
      <Table
        headers={["Recurso", "Starter", "Pro"]}
        rows={[
          ["WhatsApp conectado", "✅", "✅"],
          ["IA automática (Gemini)", "✅ Incluso", "✅ Incluso"],
          ["GPT (OpenAI) / Claude", "❌", "✅ Chave própria"],
          ["Copiloto IA", "✅", "✅"],
          ["Painel de Supervisão", "✅", "✅"],
          ["Relatórios completos", "✅", "✅"],
        ]}
      />
      <Callout type="info" icon="💡">
        O custo da IA (Gemini) já está embutido no plano — você não precisa pagar nada extra ao
        Google. Para clientes do plano Pro que escolherem GPT ou Claude, eles precisam de uma
        conta própria no provedor escolhido.
      </Callout>
    </div>
  );
}

function SectionFaq() {
  const faqs = [
    {
      q: "A IA responde fora do horário comercial?",
      a: "Sim. A IA funciona 24/7 enquanto o WhatsApp estiver conectado. Você pode instruir no prompt para que ela informe os horários de atendimento humano e peça para o cliente aguardar.",
    },
    {
      q: "O cliente sabe que está falando com uma IA?",
      a: "Depende do prompt configurado. É possível dar um nome humano ao agente ou deixar explícito que é uma IA. Recomendamos transparência, mas a escolha é sua.",
    },
    {
      q: "Posso usar meu número pessoal do WhatsApp?",
      a: "Tecnicamente sim, mas não recomendamos. As mensagens pessoais também aparecerão no sistema. Use um número dedicado ao negócio.",
    },
    {
      q: "O que acontece se o celular desligar?",
      a: "A conexão com o WhatsApp cai. As mensagens dos clientes ficam armazenadas e chegam quando o celular voltar online. A IA não responde nesse intervalo.",
    },
    {
      q: "Posso ter múltiplos números de WhatsApp?",
      a: "Atualmente o sistema suporta 1 número por empresa. Suporte a múltiplos números está no roadmap.",
    },
    {
      q: "Meus dados estão seguros?",
      a: "Sim. Todos os dados são armazenados no Supabase com isolamento por empresa (Row Level Security). Cada empresa acessa apenas seus próprios dados. As mensagens trafegam via HTTPS.",
    },
  ];
  return (
    <div>
      <Eyebrow>Suporte</Eyebrow>
      <PageTitle>Perguntas Frequentes</PageTitle>
      <PageDesc>Respostas rápidas para as dúvidas mais comuns.</PageDesc>
      <div className="flex flex-col gap-3 mt-2">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-xl border border-border bg-card p-5">
            <p className="font-bold text-sm text-foreground mb-2">{f.q}</p>
            <p className="text-sm text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
