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
  | "dashboard"
  | "conversas"
  | "crm"
  | "agente-ia"
  | "campanhas"
  | "agendadas"
  | "cadencias"
  | "flows"
  | "contatos"
  | "filas"
  | "respostas-rapidas"
  | "supervisao"
  | "relatorios"
  | "conexao"
  | "equipe"
  | "integracoes"
  | "configuracoes"
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
      { id: "dashboard" as Section, label: "Dashboard", icon: "📊" },
      { id: "conversas" as Section, label: "Conversas", icon: "💬" },
      { id: "crm" as Section, label: "CRM Kanban", icon: "🗂️" },
      { id: "agente-ia" as Section, label: "Agente IA", icon: "🤖" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "campanhas" as Section, label: "Campanhas", icon: "📣" },
      { id: "agendadas" as Section, label: "Agendadas", icon: "⏰" },
      { id: "cadencias" as Section, label: "Cadências", icon: "🔁" },
      { id: "flows" as Section, label: "Flow Builder", icon: "🧩" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { id: "contatos" as Section, label: "Contatos", icon: "📇" },
      { id: "filas" as Section, label: "Filas", icon: "🚦" },
      { id: "respostas-rapidas" as Section, label: "Respostas Rápidas", icon: "⚡" },
      { id: "supervisao" as Section, label: "Supervisão", icon: "📈" },
      { id: "relatorios" as Section, label: "Relatórios", icon: "📉" },
      { id: "conexao" as Section, label: "Conexão", icon: "📱" },
      { id: "equipe" as Section, label: "Equipe", icon: "👥" },
      { id: "integracoes" as Section, label: "Integrações", icon: "🔌" },
      { id: "configuracoes" as Section, label: "Configurações", icon: "⚙️" },
    ],
  },
  {
    label: "Suporte",
    items: [
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
        {active === "dashboard" && <SectionDashboard />}
        {active === "conversas" && <SectionConversas />}
        {active === "crm" && <SectionCrm />}
        {active === "agente-ia" && <SectionAgenteIa />}
        {active === "campanhas" && <SectionCampanhas />}
        {active === "agendadas" && <SectionAgendadas />}
        {active === "cadencias" && <SectionCadencias />}
        {active === "flows" && <SectionFlows />}
        {active === "contatos" && <SectionContatos />}
        {active === "filas" && <SectionFilas />}
        {active === "respostas-rapidas" && <SectionRespostasRapidas />}
        {active === "supervisao" && <SectionSupervisao />}
        {active === "relatorios" && <SectionRelatorios />}
        {active === "conexao" && <SectionConexao />}
        {active === "equipe" && <SectionEquipe />}
        {active === "integracoes" && <SectionIntegracoes />}
        {active === "configuracoes" && <SectionConfiguracoes />}
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

function Performance({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3 my-4 text-sm text-foreground">
      <span className="text-lg shrink-0">⚡</span>
      <div>
        <p className="font-bold text-xs uppercase tracking-wide text-primary mb-1">
          Otimização de performance
        </p>
        {children}
      </div>
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
    { id: "dashboard", icon: "📊", title: "Dashboard", desc: "Visão geral de conversas, IA e receita" },
    { id: "conversas", icon: "💬", title: "Conversas", desc: "Inbox em tempo real com Copiloto IA" },
    { id: "crm", icon: "🗂️", title: "CRM Kanban", desc: "Funil visual de leads e vendas" },
    { id: "agente-ia", icon: "🤖", title: "Agente IA", desc: "Configurar respostas automáticas com IA" },
    { id: "supervisao", icon: "📈", title: "Supervisão", desc: "Painel de controle para gestores" },
  ];
  return (
    <div>
      <Eyebrow>Documentação Oficial</Eyebrow>
      <PageTitle>Bem-vindo ao {brand.name}</PageTitle>
      <PageDesc>
        Plataforma de atendimento inteligente via WhatsApp com IA integrada, CRM visual e painel
        de supervisão em tempo real. Este manual explica cada item do menu lateral — o que ele
        faz e como usá-lo para extrair o máximo de performance da operação.
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
          { title: "Conecte o WhatsApp", desc: "Vá em Conexão, clique em Conectar WhatsApp e escaneie o QR Code com o celular." },
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
        <strong className="text-foreground">Agente IA</strong> no menu e descreva seu negócio —
        a própria IA gera a configuração inicial para você revisar e ajustar.
      </p>
      <H2>3. Convidar a equipe</H2>
      <p className="text-sm text-muted-foreground">
        Acesse <strong className="text-foreground">Equipe</strong> para convidar atendentes.
        Cada membro acessa com seu próprio login e permissões de acordo com o perfil.
      </p>
      <Performance>
        Siga essa ordem — WhatsApp conectado primeiro, depois Agente IA, depois equipe. Convidar
        a equipe antes de configurar o Agente costuma gerar atendimentos inconsistentes no
        primeiro dia, porque cada atendente ainda não sabe o que a IA já resolve sozinha.
      </Performance>
    </div>
  );
}

function SectionDashboard() {
  return (
    <div>
      <Eyebrow>Atendimento</Eyebrow>
      <PageTitle>Dashboard</PageTitle>
      <PageDesc>Visão geral da operação: conversas, resolução por IA, negociações e receita, com gráfico de tendência.</PageDesc>
      <H2>O que você vê na tela</H2>
      <CardGrid
        items={[
          { icon: "💬", title: "Conversas", desc: "Total de conversas recebidas no período selecionado." },
          { icon: "🤖", title: "Resolvidas pela IA", desc: "% de atendimentos que a IA fechou sem intervenção humana." },
          { icon: "🤝", title: "Em negociação", desc: "Leads que estão em conversa ativa no funil de vendas." },
          { icon: "💰", title: "Receita (ganhos)", desc: "Soma do valor dos cards marcados como Ganho no período." },
        ]}
      />
      <H2>Filtros de período</H2>
      <p className="text-sm text-muted-foreground">
        Use os botões <strong className="text-foreground">Hoje</strong>,{" "}
        <strong className="text-foreground">7 dias</strong>,{" "}
        <strong className="text-foreground">30 dias</strong> ou{" "}
        <strong className="text-foreground">Personalizado</strong> (com data inicial e final) para
        recalcular todos os indicadores e o gráfico de atendimentos.
      </p>
      <H2>Painel "Precisa de você"</H2>
      <p className="text-sm text-muted-foreground">
        Lista o que exige atenção imediata: conversas <strong className="text-foreground">paradas há mais de 1h</strong>,{" "}
        <strong className="text-foreground">follow-ups</strong> pendentes e{" "}
        <strong className="text-foreground">leads novos</strong> sem primeiro contato. Clique em
        qualquer item para ir direto à conversa ou ao card no CRM.
      </p>
      <Performance>
        O Dashboard é a tela que deve abrir todo início de turno. Comece sempre pelo painel
        "Precisa de você" — ele já prioriza o que está atrasado, evitando que você navegue às
        cegas pelo CRM ou pelo inbox procurando o que ficou parado.
      </Performance>
    </div>
  );
}

function SectionConversas() {
  return (
    <div>
      <Eyebrow>Atendimento</Eyebrow>
      <PageTitle>Conversas</PageTitle>
      <PageDesc>Inbox unificado do WhatsApp, em tempo real, com Copiloto IA para sugerir respostas.</PageDesc>
      <H2>Organizando o inbox</H2>
      <p className="text-sm text-muted-foreground mb-4">
        Use os filtros <strong className="text-foreground">Todas</strong>,{" "}
        <strong className="text-foreground">Não lidas</strong>,{" "}
        <strong className="text-foreground">Atribuídas a mim</strong>,{" "}
        <strong className="text-foreground">IA ativa</strong> e{" "}
        <strong className="text-foreground">Resolvidas</strong> para focar só no que importa.
        O campo de busca encontra conversas por nome ou número.
      </p>
      <H2>Ações na conversa</H2>
      <Table
        headers={["Ação", "Como fazer", "Resultado"]}
        rows={[
          ["Assumir a conversa", "Clique em Assumir ou simplesmente digite uma mensagem", "A IA é pausada automaticamente para aquele contato"],
          ["Pausar/reativar IA", "Clique no ícone de robô no topo do chat", "Fica vermelho quando pausada; verde quando ativa"],
          ["Transferir", "Use o dropdown Transferir", "Move a conversa para outro membro da equipe"],
          ["Usar atalho", "Digite / na caixa de texto", "Abre autocomplete das Respostas Rápidas cadastradas"],
          ["Copiloto IA", "Clique no ícone de varinha (✨) ao lado do envio", "Gera uma sugestão de resposta contextualizada em 2–3s"],
          ["Encerrar", "Clique em Encerrar", "Pede o motivo de fechamento e move o card no CRM"],
        ]}
      />
      <H2>Painel lateral do lead</H2>
      <p className="text-sm text-muted-foreground">
        Ao lado do chat você edita a <strong className="text-foreground">Etapa do CRM</strong>,
        adiciona <strong className="text-foreground">Tags</strong>, escreve{" "}
        <strong className="text-foreground">Observações</strong> e{" "}
        <strong className="text-foreground">Notas internas</strong> (Ctrl+Enter salva rápido), e
        pode gerar um <strong className="text-foreground">Resumo por IA</strong> da conversa
        inteira com um clique.
      </p>
      <Callout type="success" icon="💡">
        A sugestão do Copiloto nunca é enviada sozinha — você sempre revisa, edita se precisar e
        aprova antes de disparar.
      </Callout>
      <Performance>
        Combine Copiloto + atalhos "/". O Copiloto resolve mensagens que exigem raciocínio (uma
        objeção, uma pergunta específica do cliente); os atalhos resolvem o que se repete todo
        dia (saudação, horário de funcionamento, forma de pagamento). Isso reduz o tempo médio de
        resposta sem perder qualidade. Deixe a IA automática ligada para a triagem inicial e
        assuma manualmente só quando o cliente pedir atendimento humano — assim seu time
        concentra energia nas conversas que realmente precisam de uma pessoa.
      </Performance>
    </div>
  );
}

function SectionCrm() {
  return (
    <div>
      <Eyebrow>Atendimento</Eyebrow>
      <PageTitle>CRM Kanban</PageTitle>
      <PageDesc>Funil visual de vendas — cada conversa vira um card que se move entre etapas, manual ou automaticamente pela IA.</PageDesc>
      <H2>Como funciona</H2>
      <p className="text-sm text-muted-foreground mb-4">
        Cada coluna representa uma etapa do seu funil (ex: Novo, Negociando, Ganho, Perdido).
        Arraste o card entre colunas para atualizar o status do lead — a IA também move
        automaticamente quando identifica avanço na conversa.
      </p>
      <H2>Gerenciando etapas e cards</H2>
      <Table
        headers={["Ação", "Como fazer"]}
        rows={[
          ["Criar etapa", 'Clique em "Nova etapa" e defina nome + cor'],
          ["Renomear/recolorir etapa", "Menu (⋯) da coluna → Renomear / cor"],
          ["Excluir etapa", "Menu (⋯) da coluna → Excluir (é preciso manter ao menos uma etapa)"],
          ["Adicionar lead do WhatsApp", 'Botão "Adicionar do WhatsApp" — lista conversas recentes que ainda não estão no CRM'],
          ["Ver detalhes do lead", "Clique no card — abre a ficha completa (mesma do inbox)"],
        ]}
      />
      <Callout type="info" icon="ℹ️">
        Cada card mostra nome, número, prévia da última mensagem, tags, valor (R$) e a etiqueta
        "IA" quando o agente está respondendo aquele contato.
      </Callout>
      <Performance>
        Mantenha o funil enxuto: 4 a 6 etapas é o ideal. Quanto mais colunas, mais fácil um lead
        "sumir" numa etapa esquecida. Revise diariamente a etapa inicial (novos leads) — ela é a
        que mais impacta conversão, porque é onde o tempo de resposta pesa mais.
      </Performance>
    </div>
  );
}

function SectionAgenteIa() {
  return (
    <div>
      <Eyebrow>Automação</Eyebrow>
      <PageTitle>Agente IA</PageTitle>
      <PageDesc>Configure uma IA que responde clientes sozinha, 24h por dia, com a personalidade e o conhecimento do seu negócio.</PageDesc>
      <H2>Configuração guiada</H2>
      <Steps
        items={[
          { title: "Descreva seu negócio", desc: "Em poucas frases: o que você vende, horários, forma de entrega/atendimento, tom de voz desejado." },
          { title: "Responda a entrevista da IA", desc: "O sistema faz perguntas complementares para cobrir pontos que ficaram vagos na descrição." },
          { title: "Revise a configuração gerada", desc: "A IA monta nome do agente, prompt e regras automaticamente — você pode editar tudo antes de ativar." },
          { title: "Teste antes de ativar", desc: "Digite uma mensagem simulando um cliente no campo de teste e veja a resposta exata que seria enviada." },
        ]}
      />
      <H2>Ajustes finos</H2>
      <Table
        headers={["Campo", "Para que serve"]}
        rows={[
          ["Tamanho de resposta", '"Curtas" soa mais natural no WhatsApp; "longas" serve para respostas mais técnicas/detalhadas.'],
          ["Responder em partes", "Envia a resposta em várias mensagens curtas em vez de um bloco só de texto — imita digitação humana."],
          ["Palavra para pausar/despausar", 'Comandos como "/pausar" e "/despausar" que o atendente digita no chat para assumir ou devolver o controle à IA.'],
          ["Telefone de transferência", "Número para onde a IA orienta o cliente quando precisa de atendimento humano fora do chat."],
        ]}
      />
      <Callout type="info" icon="📝">
        Para controle total do prompt (texto bruto enviado à IA), use o link{" "}
        <strong>"Editar em modo avançado"</strong> dentro da própria tela do Agente IA.
      </Callout>
      <Performance>
        Prompts curtos e específicos performam melhor que textos longos e genéricos. Inclua
        sempre: horário de funcionamento, preços/produtos principais, e o que a IA{" "}
        <strong className="text-foreground">não</strong> deve prometer sem confirmar. Depois de
        qualquer alteração, use sempre o campo de teste antes de salvar — pegar um erro de tom ou
        de informação ali custa segundos; pegar depois que um cliente real recebeu custa uma
        venda.
      </Performance>
    </div>
  );
}

function SectionCampanhas() {
  return (
    <div>
      <Eyebrow>Marketing</Eyebrow>
      <PageTitle>Campanhas</PageTitle>
      <PageDesc>Disparo de mensagens em massa via WhatsApp para uma lista de contatos.</PageDesc>
      <H2>Criando uma campanha</H2>
      <Steps
        items={[
          { title: 'Clique em "Nova campanha"', desc: "Defina nome, a mensagem e o intervalo entre envios." },
          { title: "Adicione os contatos", desc: 'Importe um CSV ou adicione manualmente número + nome de cada destinatário.' },
          { title: "Revise e envie", desc: "Confira a lista, ajuste linhas com erro e inicie o disparo." },
          { title: "Acompanhe o progresso", desc: "A campanha mostra barra de progresso e pode ser pausada a qualquer momento." },
        ]}
      />
      <Callout type="danger" icon="🚫">
        <strong>Intervalo entre envios:</strong> o mínimo permitido é 1000ms (1s), mas o
        recomendado é <strong>3000ms</strong>. Enviar rápido demais é o principal motivo de
        bloqueio de números pelo WhatsApp.
      </Callout>
      <H2>Status de uma campanha</H2>
      <p className="text-sm text-muted-foreground">
        Rascunho → Agendada → Enviando → (Pausada, se você interromper) → Concluída. Erros por
        contato ficam registrados sem travar o restante do disparo.
      </p>
      <Performance>
        Nunca dispare para uma base fria e grande de uma vez. Segmente listas menores (algumas
        centenas por campanha), use o intervalo recomendado de 3s, e evite repetir a mesma
        mensagem para a mesma lista em um curto período — isso preserva a reputação do número
        conectado e reduz o risco de bloqueio.
      </Performance>
    </div>
  );
}

function SectionAgendadas() {
  return (
    <div>
      <Eyebrow>Marketing</Eyebrow>
      <PageTitle>Agendadas</PageTitle>
      <PageDesc>Programe uma mensagem pontual para ser enviada automaticamente numa data e hora futuras.</PageDesc>
      <H2>Como agendar</H2>
      <Steps
        items={[
          { title: 'Clique em "Agendar mensagem"', desc: "Informe telefone (com DDI + DDD), nome do contato (opcional) e a mensagem." },
          { title: "Escolha data e hora", desc: "O sistema exige um horário no futuro — não é possível agendar para o passado." },
          { title: "Acompanhe o status", desc: "Pendente → Enviado (ou Erro, se falhar). Cancele ou remova a qualquer momento antes do envio." },
        ]}
      />
      <Callout type="info" icon="ℹ️">
        <strong>Agendadas</strong> é para um envio único e pontual (ex: lembrete de um
        compromisso). Para sequências automáticas baseadas em silêncio do cliente, use{" "}
        <strong>Cadências</strong>.
      </Callout>
      <Performance>
        Use Agendadas para confirmações e lembretes com horário certo (véspera de consulta,
        aniversário do cliente, cobrança de boleto). Evite usá-la como substituto de campanha em
        massa — para volume, Campanhas já cuida do intervalo de envio automaticamente.
      </Performance>
    </div>
  );
}

function SectionCadencias() {
  return (
    <div>
      <Eyebrow>Marketing</Eyebrow>
      <PageTitle>Cadências</PageTitle>
      <PageDesc>Sequências automáticas de reengajamento disparadas pelo silêncio do contato — sem depender de nenhum sistema externo.</PageDesc>
      <H2>Montando uma cadência</H2>
      <Steps
        items={[
          { title: 'Clique em "Nova cadência"', desc: "Dê um nome e uma descrição para identificar o objetivo." },
          { title: "Adicione etapas", desc: 'Cada etapa define "dias de silêncio pra disparar" e a mensagem enviada naquele momento.' },
          { title: "Ative a cadência", desc: 'Marque "Cadência ativa" — a partir daí, contatos parados entram automaticamente na sequência.' },
        ]}
      />
      <Callout type="warning" icon="⚠️">
        Ao excluir uma cadência, contatos atualmente inscritos param de receber os follow-ups
        pendentes — a ação não pode ser desfeita.
      </Callout>
      <Performance>
        Comece com 2–3 etapas (ex: 3, 7 e 14 dias de silêncio) em vez de sequências longas. Cada
        etapa deve mudar o ângulo da mensagem — não repita o mesmo texto, ou o lead vai ignorar.
        Cadências curtas e variadas recuperam mais conversas do que sequências longas e
        repetitivas.
      </Performance>
    </div>
  );
}

function SectionFlows() {
  return (
    <div>
      <Eyebrow>Marketing</Eyebrow>
      <PageTitle>Flow Builder</PageTitle>
      <PageDesc>Editor visual de fluxos de conversa automatizados — arraste blocos, conecte e publique.</PageDesc>
      <H2>Tipos de nó</H2>
      <Table
        headers={["Nó", "O que faz"]}
        rows={[
          ["Mensagem", "Envia um texto fixo para o contato"],
          ["Condição", 'Ramifica o fluxo comparando uma variável (ex: "Mensagem recebida") com um valor, usando Contém / Igual a / Começa com'],
          ["Delay", "Aguarda de 1 a 300 segundos antes de seguir para o próximo nó"],
          ["Fim", "Encerra a execução do fluxo"],
        ]}
      />
      <H2>Disparando um fluxo</H2>
      <p className="text-sm text-muted-foreground">
        Defina o gatilho do fluxo: <strong className="text-foreground">Palavra-chave</strong>{" "}
        (ex: "orçamento"), <strong className="text-foreground">Primeiro contato</strong> (nova
        conversa) ou <strong className="text-foreground">Sempre</strong> (toda mensagem recebida).
      </p>
      <Performance>
        Fluxos curtos com poucas ramificações são mais fáceis de manter e depurar. Prefira vários
        fluxos pequenos e específicos (um por intenção do cliente) a um único fluxo gigante com
        dezenas de condições — isso facilita achar e corrigir um nó com problema rapidamente.
      </Performance>
    </div>
  );
}

function SectionContatos() {
  return (
    <div>
      <Eyebrow>Gestão</Eyebrow>
      <PageTitle>Contatos</PageTitle>
      <PageDesc>Base completa de leads e clientes, com busca, filtro por etapa e importação em massa.</PageDesc>
      <H2>Adicionando contatos</H2>
      <Table
        headers={["Forma", "Como fazer"]}
        rows={[
          ["Manual", '"Novo contato" → informe nome e telefone com DDI'],
          ["Importação em massa", '"Importar CSV" → mapeie as colunas do arquivo (Telefone, Nome, Observação, Tags, Valor, Origem) e escolha a etapa de destino'],
        ]}
      />
      <Callout type="info" icon="ℹ️">
        O sistema tenta detectar automaticamente as colunas do seu CSV pelo nome do cabeçalho
        (ex: "telefone", "tel" ou "fone" viram o campo Telefone). Revise o mapeamento antes de
        confirmar — a prévia mostra as primeiras linhas com um ícone de válido/inválido por
        registro.
      </Callout>
      <Performance>
        Importações são processadas em lotes de até 500 linhas por arquivo — para bases maiores,
        divida em vários arquivos CSV. Garanta que o telefone tenha DDI + DDD (mínimo 8 dígitos
        numéricos) antes de importar, ou a linha será marcada como inválida e ignorada.
      </Performance>
    </div>
  );
}

function SectionFilas() {
  return (
    <div>
      <Eyebrow>Gestão</Eyebrow>
      <PageTitle>Filas</PageTitle>
      <PageDesc>Times/setores de atendimento com distribuição automática de conversas e horário de funcionamento próprio.</PageDesc>
      <H2>Configurando uma fila</H2>
      <p className="text-sm text-muted-foreground mb-2">A tela é dividida em 3 abas:</p>
      <Table
        headers={["Aba", "O que configurar"]}
        rows={[
          ["Geral", "Nome, descrição, cor e o switch Distribuição automática (round-robin)"],
          ["Membros", "Quais atendentes fazem parte dessa fila"],
          ["Horário", "Fuso horário, dias e horários de funcionamento, e mensagem automática fora do horário"],
        ]}
      />
      <Callout type="info" icon="ℹ️">
        Com <strong>round-robin</strong> ativado, cada nova conversa é atribuída automaticamente
        ao membro da fila com menor carga de atendimentos abertos — ninguém fica sobrecarregado
        enquanto outro atendente está ocioso.
      </Callout>
      <Callout type="warning" icon="⏰">
        Fora do horário configurado, a IA não responde e o contato recebe a mensagem automática
        cadastrada — reenviada no máximo 1x a cada 4h para o mesmo contato, evitando spam.
      </Callout>
      <Performance>
        Crie uma fila por especialidade (ex: Vendas, Suporte) em vez de uma única fila genérica
        com todo mundo. Isso faz o round-robin distribuir carga de forma mais justa e relevante —
        cada atendente só recebe o que sabe resolver.
      </Performance>
    </div>
  );
}

function SectionRespostasRapidas() {
  return (
    <div>
      <Eyebrow>Gestão</Eyebrow>
      <PageTitle>Respostas Rápidas</PageTitle>
      <PageDesc>Modelos de mensagem prontos para usar direto na tela de Conversas, digitando "/" mais o atalho.</PageDesc>
      <H2>Criando um modelo</H2>
      <Steps
        items={[
          { title: 'Clique em "Nova resposta"', desc: "Preencha Título (nome interno), Atalho (opcional, sem espaços) e a Mensagem." },
          { title: "Use no chat", desc: 'Digite "/" seguido do atalho na caixa de mensagem — o autocomplete mostra as opções que combinam.' },
        ]}
      />
      <Performance>
        Padronize atalhos curtos e fáceis de lembrar (ex: "/horario", "/pix", "/entrega"). Quanto
        mais a equipe usa atalhos em vez de digitar do zero, mais rápido é o primeiro contato —
        e tempo de primeira resposta é o fator que mais pesa na conversão de um lead.
      </Performance>
    </div>
  );
}

function SectionSupervisao() {
  return (
    <div>
      <Eyebrow>Gestão em Tempo Real</Eyebrow>
      <PageTitle>Supervisão</PageTitle>
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
      <Performance>
        Use "Carga Média" como termômetro do dia: se estiver muito acima do normal, é hora de
        remanejar atendentes entre filas ou reforçar a equipe. Cards vermelhos (espera acima de
        30 min) são sempre a primeira prioridade — cada minuto adicional de espera reduz a
        chance de conversão do lead.
      </Performance>
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
      <Performance>
        Acompanhe NPS e TMA juntos, não isolados: TMA baixo com NPS baixo geralmente indica
        respostas rápidas mas rasas (o cliente não sentiu que resolveu). Use os dois números
        para calibrar se o time precisa ser mais rápido ou mais cuidadoso.
      </Performance>
    </div>
  );
}

function SectionConexao() {
  return (
    <div>
      <Eyebrow>Integração</Eyebrow>
      <PageTitle>Conexão</PageTitle>
      <PageDesc>Conectar, reconectar e monitorar o status do número de WhatsApp usado pela plataforma.</PageDesc>
      <H2>Conectar o WhatsApp</H2>
      <Steps
        items={[
          { title: "Acesse Conexão", desc: "No menu lateral, clique em Conexão." },
          { title: 'Clique em "Conectar WhatsApp"', desc: "Um QR Code será gerado." },
          { title: "Escaneie com o celular", desc: "Abra o WhatsApp no celular → Menu (⋮) → Aparelhos conectados → Conectar um aparelho. Aponte a câmera para o QR." },
          { title: 'Status muda para "Conectado"', desc: "O número de telefone aparecerá na tela. A partir daqui as mensagens são respondidas automaticamente." },
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
      <Performance>
        O status é verificado automaticamente a cada 5 segundos enquanto o QR está pendente, mas
        a estabilidade real depende do celular: deixe-o sempre carregando e conectado ao Wi-Fi.
        Quedas de conexão frequentes são a causa nº 1 de mensagens perdidas — não de bug do
        sistema.
      </Performance>
    </div>
  );
}

function SectionEquipe() {
  return (
    <div>
      <Eyebrow>Gestão de Pessoas</Eyebrow>
      <PageTitle>Equipe</PageTitle>
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
          { title: "Acesse Equipe", desc: "Clique em Convidar membro." },
          { title: "Informe o e-mail e o perfil", desc: "Escolha entre Atendente, Supervisor ou Admin." },
          { title: "Compartilhe o acesso", desc: "Se o membro é novo, uma senha temporária é gerada — envie a ele para o primeiro login." },
        ]}
      />
      <H2>Gerenciando quem já está na equipe</H2>
      <p className="text-sm text-muted-foreground">
        O dono da empresa pode alterar o papel de qualquer membro pela lista. Admin e dono também
        podem <strong className="text-foreground">ativar/desativar</strong> ou{" "}
        <strong className="text-foreground">remover</strong> um membro — remover é definitivo e
        não pode ser desfeito.
      </p>
      <Performance>
        Desative em vez de remover quando for algo temporário (férias, afastamento) — assim o
        histórico de atendimentos da pessoa continua vinculado corretamente nos relatórios. Só
        remova de fato quando o vínculo com a empresa acabar de vez.
      </Performance>
    </div>
  );
}

function SectionIntegracoes() {
  return (
    <div>
      <Eyebrow>Gestão</Eyebrow>
      <PageTitle>Integrações</PageTitle>
      <PageDesc>Chaves de API e webhooks para conectar o {brand.name} a sistemas externos.</PageDesc>
      <H2>Chaves de API</H2>
      <Steps
        items={[
          { title: 'Clique em "Nova chave"', desc: "Dê um nome que identifique onde ela será usada." },
          { title: "Copie a chave imediatamente", desc: "Ela é exibida apenas uma vez — depois disso não pode ser recuperada, só revogada e recriada." },
          { title: "Use nas suas integrações", desc: "Autentique requisições à API do sistema com essa chave." },
        ]}
      />
      <Callout type="danger" icon="🔑">
        <strong>Chave criada! Copie agora</strong> — ela não será exibida novamente por
        segurança. Se perder, revogue e crie outra.
      </Callout>
      <H2>Webhooks</H2>
      <p className="text-sm text-muted-foreground mb-2">
        Configure uma URL de destino e escolha quais eventos disparam a notificação:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        <li>mensagem.recebida</li>
        <li>mensagem.enviada</li>
        <li>contato.criado</li>
        <li>lead.movido</li>
        <li>campanha.concluida</li>
      </ul>
      <Performance>
        Selecione só os eventos que você realmente consome do outro lado — assinar todos os
        eventos "por garantia" gera tráfego e processamento desnecessário no seu sistema
        externo. Revogue chaves de integrações descontinuadas em vez de deixá-las ativas sem uso.
      </Performance>
    </div>
  );
}

function SectionConfiguracoes() {
  return (
    <div>
      <Eyebrow>Administração</Eyebrow>
      <PageTitle>Configurações</PageTitle>
      <PageDesc>Central de ajustes da empresa: identidade visual, campos personalizados, NPS, perfil e plano.</PageDesc>
      <Callout type="warning" icon="🔒">
        Restrito a usuários <strong>Admin</strong> ou dono da empresa.
      </Callout>
      <H2>Abas disponíveis</H2>
      <Table
        headers={["Aba", "O que ajustar"]}
        rows={[
          ["Plano", "Plano atual, status do trial e link para trocar de plano ou cadastrar cartão"],
          ["Empresa", "Nome da empresa e telefone de contato"],
          ["Identidade", "Cor primária do sistema e URL do logo, com prévia ao vivo"],
          ["Campos", "Campos personalizados do CRM (texto, número, data, sim/não, seleção)"],
          ["NPS", "Ativar envio automático de pesquisa de satisfação, mensagem e delay após encerrar o atendimento"],
          ["Perfil", "Seu nome e troca de senha"],
        ]}
      />
      <Performance>
        Configure Identidade e Campos personalizados logo no início, antes de a equipe começar a
        cadastrar contatos e leads em massa — mudar um campo obrigatório depois pode invalidar
        dados já preenchidos. Revise o plano periodicamente: ficar perto do limite de contatos ou
        usuários sem perceber é a causa mais comum de interrupção inesperada da operação.
      </Performance>
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
      a: "Sim. A IA funciona 24/7 enquanto o WhatsApp estiver conectado. Você pode instruir no prompt para que ela informe os horários de atendimento humano e peça para o cliente aguardar. Se a fila tiver horário de funcionamento configurado, fora dele a mensagem automática substitui a IA.",
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
      q: "Qual a diferença entre Agendadas e Cadências?",
      a: "Agendadas dispara uma mensagem única em data/hora marcada. Cadências dispara uma sequência de mensagens automaticamente quando um contato fica em silêncio por X dias.",
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
