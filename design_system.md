# Design System — ToledoTech
**Versão:** 2.0.0
**Padrão Visual:** Digital Futurista (Dark, ergonômico para uso prolongado)
**Slogan Oficial:** "Sistemas inteligentes para mercados em evolução"

Este arquivo é a fonte única de verdade para cores, tipografia, componentes e regras de UI do ecossistema ToledoTech (Gestão, Imobi, Sales e demais módulos). Qualquer projeto novo ou existente deve seguir estas diretrizes.

---

## 1. Tokens de Cor

```css
:root {
  /* Base */
  --darkBg: #0F1623;       /* fundo principal de telas/layouts */
  --surface: #1A2540;      /* cards, modais, sidebars, tabelas, inputs internos não usam isso */
  --border: #263350;       /* bordas, divisores, linhas de tabela */

  /* Texto */
  --textPrimary: #CBD5E1;  /* títulos, dados, texto corrido */
  --textMuted: #64748B;    /* labels, placeholders, legendas */

  /* Cor de marca / destaque (substitui o antigo roxo) */
  --neonGreen: #34D399;    /* sucesso, CTAs primários, saldos positivos, branding */
  --glow-green: 0 0 15px rgba(52,211,153,0.12);

  /* Seleção / estado ativo (azul, NÃO roxo) */
  --selectBlue: #1E2E48;        /* fundo de item ativo/selecionado */
  --selectBlueBorder: #2E4570;  /* borda de foco e seleção */
  --selectBlueText: #7EB3F5;    /* texto/ícone em estado ativo */

  /* Estados semânticos */
  --errorRed: #F87171;
  --errorBg: rgba(248,113,113,0.08);
  --errorBorder: rgba(248,113,113,0.25);

  --warnAmber: #FBBF24;
  --warnBg: rgba(251,191,36,0.08);
  --warnBorder: rgba(251,191,36,0.25);

  --infoBlue: #60A5FA;
  --infoBg: rgba(96,165,250,0.08);
  --infoBorder: rgba(96,165,250,0.25);
}

/* Fundo de página (fora do :root, body) */
body { background: #0D1117; }
```

### Regras de uso
- **Fundo de página** (`body`): `#0D1117`
- **Fundo de containers/layouts** (`.app-layout`, `.login-screen`): `var(--darkBg)`
- **Cards, sidebars, modais, inputs**: `var(--surface)` com `border: 1px solid var(--border)`
- **Verde neon** (`--neonGreen`): reservado para sucesso, valores positivos, CTA primário (botão "Salvar", "Entrar") e branding (logo, badges do módulo Gestão). **Nunca usar em texto corrido extenso.**
- **Azul de seleção** (`--selectBlue*`): todo estado de **interação/foco** — item de menu ativo, tab ativa, input focado, hover de linha de tabela, hover de ícones de ação. É o substituto oficial do antigo roxo electric.
- ⚠️ **Roxo electric (`#8A2BE2`) está banido do design system.** Não usar em nenhum componente novo.
- **Vermelho/Âmbar/Azul-info**: exclusivos para alertas, badges de status negativo/atenção/informativo. Nunca usar como cor decorativa.

---

## 2. Tipografia

```css
font-family: 'Plus Jakarta Sans', Inter, sans-serif;       /* interface geral */
font-family: 'JetBrains Mono', 'Fira Code', monospace;      /* dados, valores, IDs, datas, placas */
```

- **Plus Jakarta Sans**: títulos, menus, labels, textos, nomes de cliente/produto.
- **JetBrains Mono**: qualquer valor numérico/alfanumérico tabular — preços, KPIs, datas, placas, RENAVAM, IDs, quilometragem. Obrigatório para alinhamento vertical em tabelas e relatórios financeiros.
- Pesos: 400 (regular), 600 (semibold/labels), 700 (bold/títulos).

---

## 3. Regras de Componentes

### Border-radius
- Cards, inputs, botões: `8px` a `12px` (`rounded-lg` / `rounded-xl`)
- Badges/tags: `4px` a `6px`
- Avatares: `50%`

### Estados de Input
| Estado | Aparência |
|---|---|
| Normal | `border: 1px solid var(--border)`, fundo `var(--darkBg)` |
| Focado | `border-color: var(--selectBlueBorder)` + `box-shadow: 0 0 0 3px rgba(46,69,112,0.3)` |
| Erro | `border-color: var(--errorBorder)`; ao focar, sombra vermelha; mensagem abaixo com `--errorRed` |
| Válido | `border-color: rgba(52,211,153,0.3)`; mensagem de confirmação em `--neonGreen` |
| Desabilitado | `opacity: 0.4; cursor: not-allowed` |
| Aviso | `border-color: var(--warnBorder)`; mensagem em `--warnAmber` |

### Tabelas
- Fundo do card da tabela: `var(--surface)`
- Cabeçalho (`th`): uppercase, `10px`, `--textMuted`, `letter-spacing: 0.5px`
- Células (`td`): `JetBrains Mono`, `12px`, exceto colunas de texto (nome, produto) que usam a fonte padrão
- **Ações de linha** (editar/excluir): ocultas por padrão (`opacity: 0`), visíveis no `:hover` da linha (`opacity: 1`)
- **Hover de linha**: `background: var(--selectBlue)`
- Três densidades disponíveis (ver seção 6): Confortável / Normal / Compacto

### Botões
| Classe | Uso |
|---|---|
| `.btn-green` | Ação primária (Salvar, Confirmar, Nova Venda) |
| `.btn-ghost` | Ação secundária (Cancelar, Filtros, Exportar) |
| `.btn-danger` | Ação destrutiva (Excluir, erro) — usa cores de erro |

### Glow / Sombra
Aplicar apenas em hover de botões primários e barras de destaque, com baixa opacidade:
```css
box-shadow: 0 4px 20px rgba(52,211,153,0.25);
```
Evitar glows acima de 30% de opacidade — causa fadiga visual em uso prolongado.

---

## 4. Sidebar & Navegação

- Largura padrão: `224px`
- Logo do módulo: ícone `30x30px`, `border-radius: 7px`
  - Módulo Gestão → gradiente verde (`linear-gradient(135deg, var(--neonGreen), #059669)`)
  - Demais módulos → estilo azul (`var(--selectBlue)` + borda `var(--selectBlueBorder)`)
- Badge do módulo ao lado do nome: `.mb-green` (Gestão) ou `.mb-blue` (Imobi/Sales/outros)
- Item de menu ativo: SEMPRE azul de seleção (`.active-blue`), independente do módulo
- Avatar do usuário no rodapé da sidebar, mesmo padrão de cor do logo do módulo

---

## 5. Alertas & Notificações

### Alertas inline (`.alert`)
4 variações: `.error`, `.warning`, `.info`, `.success` — cada uma com `background`, `border-color` e `color` do texto na respectiva cor semântica (opacidade 8% no fundo, 25% na borda).

### Toasts
- Posição: canto inferior direito, `300px` de largura
- Empilhamento vertical, animação de entrada `slideIn` (translateX + fade)
- Barra de progresso inferior com a cor semântica do toast
- Auto-dismiss recomendado: 4 segundos
- Tipos: sucesso (verde), erro (vermelho), aviso (âmbar), info (azul)

### Painel de notificações
- Item não lido: ponto colorido + fundo levemente destacado (`rgba(52,211,153,0.04)` para itens relacionados a sucesso)
- Item lido: ponto em `var(--border)`, texto em `--textMuted`
- Contador de não lidas: badge vermelho circular no header

---

## 6. Densidade de Tabela

3 modos via classes no `<table>`:

```css
.tbl-comfortable td { padding: 14px 10px; font-size: 12px; }  /* apresentações, onboarding */
.tbl-normal td      { padding: 9px 10px;  font-size: 12px; }  /* padrão — uso diário */
.tbl-compact td     { padding: 5px 10px;  font-size: 11px; }  /* operadores experientes */
```

Toggle de densidade deve ficar no header do card/página, com 3 botões (`.density-toggle` / `.density-btn`).

---

## 7. Estrutura de Subdomínios (Branding)

| Sistema | Subdomínio | Badge |
|---|---|---|
| Site Institucional | `toledotech.com.br` | — |
| Gestão / ERP | `gestao.toledotech.com.br` | `[ Gestão ]` verde |
| Imobiliário | `imobi.toledotech.com.br` | `[ Imobi ]` azul |
| Sales / CRM | `sales.toledotech.com.br` | `[ Sales ]` azul |

Todos os módulos exibem logo "TT" + nome "ToledoTech" + badge do módulo no header da sidebar.

---

## 8. Princípio Geral de Ergonomia

Este design system foi calibrado especificamente para telas usadas **8h/dia**. Ao adicionar novas cores ou componentes:

- ❌ Evitar saturação 100% em qualquer cor (especialmente verde puro `#00FF66` e branco puro `#FFFFFF`)
- ❌ Evitar contraste texto/fundo acima de ~12:1
- ❌ Evitar preto absoluto (`#000000`) como fundo
- ✅ Preferir tons dessaturados (~60-70% de saturação) para cores de destaque
- ✅ Glows e sombras coloridas sempre com opacidade ≤ 25%

---

## 9. Referência Visual

O arquivo `toledotech-mockup.html` contém a implementação completa e interativa de todos os componentes acima, organizados em 7 telas:
Login · Dashboard de Vendas · Cadastro de Veículos · Relatórios · Alertas & Estados · Densidade · Notificações.

Use-o como referência viva — qualquer dúvida sobre "como deve ficar" pode ser resolvida abrindo esse arquivo no navegador.
