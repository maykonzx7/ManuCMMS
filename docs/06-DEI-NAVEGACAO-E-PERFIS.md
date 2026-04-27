# DEI — Navegação, telas e perfis (complemento ao relatório)

O relatório cita o **Documento de Especificação de Interfaces (DEI)** com wireframes, mockups e fluxo de navegação, sem detalhar telas no corpo textual acessível. Este arquivo **operacionaliza** esse capítulo: mapa de áreas, fluxos por RF e matriz **perfil × permissão**, para guiar UI/UX e critérios de aceitação.

---

## 1. Áreas funcionais da aplicação (mapa mental)

| Área | RF principais | Observação |
| ---- | ------------- | ---------- |
| Autenticação | RF-02 | Login, logout, recuperação de senha (fluxo Supabase). |
| Administração / IAM | RF-01, RF-03, RF-16 | Usuários, perfis, permissões por unidade. |
| Ativos | RF-04, RF-17 | CRUD, histórico de manutenção, limite térmico (**RN-06**). |
| Ordens de serviço | RF-05, RF-07, RF-18, RF-20 | Lista, detalhe, execução, fechamento, filtros. |
| IoT / Simulação | RF-06, RF-19 | Painel ou ação restrita (Admin/Dev) para disparo de leitura simulada. |
| Tempo real | RF-09, RF-11 | Widget de temperatura; centro de notificações. |
| Inteligência | RF-08, RF-13, RF-21 | Dashboard (Restrição **RN-03**), exportações. |
| Conformidade | RF-14, RN-12 | Consulta de auditoria e exportação. |

---

## 2. Fluxo de navegação sugerido (happy path)

1. **Login** → seleção implícita de contexto (unidade do usuário, **RN-08**).
2. **Home** diferenciada por perfil:
   - Técnico: “Minhas OS” + alertas.
   - Supervisor: OS da unidade + ativos.
   - Gestor/Admin: atalho para **Dashboard** + cadastros.
   - Auditor: **Auditoria** (sem edição de operação).
3. **Ativo** → detalhe → **Histórico de manutenções** (**RF-17**).
4. **OS** → criar (manual) → executar → anexar mídia → assinar → fechar (**RN-02**, **RN-13**).
5. **Dashboard** apenas se **RN-03** permitir.

Wireframes e mockups: produzir em Figma (ou similar) e **versionar export PNG/PDF** no repositório ou anexar ao relatório acadêmico; marcar aqui o link ou pasta quando existir.

---

## 2.1 Tela prioritária — Login corporativo

Primeira interface a ser construída no frontend. A tela de login deve representar o tom do sistema: ambiente corporativo, operacional e confiável, sem parecer landing page promocional e sem recorrer a visuais genéricos.

### Objetivo

- Permitir autenticação segura via Supabase.
- Comunicar imediatamente que o sistema opera por perfil e unidade fabril.
- Reduzir atrito no primeiro acesso em desktop, tablet e mobile.

### Wireframe textual

```text
+----------------------------------------------------------------------------------+
| TOPO                                                                              |
| ManuCMMS | Sistema corporativo de gestão de manutenção de ativos                  |
+--------------------------------------+-------------------------------------------+
| PAINEL INSTITUCIONAL                 | PAINEL DE ACESSO                          |
|                                      |                                           |
| Título:                              | Olá novamente                             |
| Controle operacional com             | Acesse seu ambiente de trabalho           |
| rastreabilidade, resposta rápida     |                                           |
| e contexto por unidade fabril        | [ Email institucional________________ ]   |
|                                      | [ Senha_______________________________ ]   |
| Destaques:                           | [ ] Lembrar acesso                        |
| - Ativos monitorados                 | [ Entrar no sistema ]                     |
| - Ordens de serviço                  |                                           |
| - Auditoria e conformidade           | Esqueci minha senha                       |
|                                      |                                           |
| Bloco inferior com indicadores       | Acesso controlado por perfil e unidade    |
| [Ativos] [OS] [Auditoria]            |                                           |
+--------------------------------------+-------------------------------------------+
| RODAPÉ: suporte | versão | ambiente                                             |
+----------------------------------------------------------------------------------+
```

### Composição visual

- Duas colunas no desktop, com bloco institucional à esquerda e formulário à direita.
- Em tablet e mobile, o formulário deve vir primeiro; o painel institucional passa para baixo.
- O painel de acesso deve ter destaque moderado, com contraste, mas sem aparência de card genérico isolado no centro.
- O rodapé deve ser simples e útil: versão, ambiente e canal de suporte.

### Componentes obrigatórios

- Campo de email institucional.
- Campo de senha com ação mostrar/ocultar.
- Checkbox “Lembrar acesso”.
- Botão primário “Entrar no sistema”.
- Link “Esqueci minha senha”.
- Mensagem contextual sobre perfil e unidade.
- Feedback de erro e carregamento.

### Estados esperados

- Padrão: formulário limpo e CTA disponível após preenchimento válido.
- Carregando: botão com texto de progresso e campos bloqueados.
- Erro: mensagem objetiva acima do formulário; sem linguagem técnica excessiva.
- Sucesso: redirecionamento imediato conforme perfil.

---

## 2.2 Direção visual do login

### Linguagem visual

- Base clara e sóbria, com superfícies bem definidas.
- Fundo em cinza gelo ou areia fria, evitando branco chapado em toda a viewport.
- Destaques em azul petróleo, grafite e aço.
- Verde reservado para estados positivos; vermelho contido para erro.
- Ícones lineares discretos; sem ilustrações chamativas ou efeitos excessivos.

### Paleta sugerida

- Primária: azul petróleo.
- Secundária: grafite.
- Fundo: cinza gelo.
- Superfície: branco aquecido.
- Destaque técnico: verde suave.
- Erro: vermelho fechado.

### Tipografia e tom

- Fonte sem serifa, legível em ambiente corporativo.
- Títulos com peso médio/semibold.
- Textos curtos, objetivos e institucionais.
- Evitar frases promocionais e linguagem genérica de produto “startup”.

### Conteúdo-base sugerido

- Título: **ManuCMMS**
- Subtítulo: **Sistema corporativo de gestão de manutenção de ativos**
- Mensagem: **Acesse o ambiente responsável pelo monitoramento de ativos, execução de ordens de serviço e rastreabilidade operacional por unidade fabril.**
- Segurança: **O acesso é controlado por perfil e contexto operacional.**

---

## 2.3 Fluxo funcional do login

1. Usuário acessa a URL inicial do frontend.
2. Sistema exibe a tela de login com contexto institucional.
3. Usuário informa email e senha.
4. Frontend autentica no Supabase.
5. Em falha, a tela mantém contexto e mostra mensagem clara.
6. Em sucesso, o frontend obtém a sessão e o token.
7. Chamadas à API backend seguem com `Authorization: Bearer`.
8. Usuário é redirecionado para a home compatível com seu perfil.

### Redirecionamento esperado por perfil

- Técnico: visão operacional e ordens atribuídas.
- Supervisor: acompanhamento de equipe e unidade.
- Gestor/Admin: gestão ampla e indicadores.
- Auditor: visão de rastreabilidade e histórico.

### Requisitos relacionados

- **RF-02**: login, logout e recuperação de senha.
- **RF-16**: permissões por perfil e unidade.
- **RN-03**: restrição por papel.
- **RN-08**: isolamento por unidade fabril.

---

## 3. Matriz perfil × capacidade (derivada do ERS/DDE)

| Capacidade | Técnico | Supervisor | Gestor | Auditor | Admin |
| ---------- | ------- | ---------- | ------ | ------- | ----- |
| Ver dashboard / KPIs | Não (**RN-03**) | Conforme política fina (**RF-16**) | Sim | Conforme política | Sim |
| CRUD usuários / permissões | Não | Não | Parcial | Não | Sim (**RF-01**, **RF-16**) |
| CRUD ativos | Sim (**RF-04**) | Sim | Sim | Leitura? | Sim |
| Criar OS manual | Sim (**RF-05**) | Sim | Conforme política | Não | Sim |
| Executar / fechar OS (próprias) | Sim (**RF-07**) | — | — | Não | — |
| Ver OS de outros técnicos | Não (**RN-03**) | Sim (unidade) | Sim (unidade) | Leitura | Sim |
| Consultar auditoria | Não | Não | Sim (**RF-14**) | Sim | Sim |
| Simular temperatura (**RF-19**) | Não | Não | Não | Não | Sim (e/ou Dev) |

Ajustar células “Conforme política” quando **RF-16** for implementado com matriz explícita de permissões.

---

## 4. Checklist DEI (entregável acadêmico)

- [x] Wireframe textual e direção visual da tela de login.
- [ ] Wireframes das telas: lista OS, detalhe OS, cadastro ativo, dashboard, auditoria.
- [ ] Mockups com identidade visual e estados (loading, erro, vazio).
- [ ] Fluxo de navegação documentado (diagrama ou mapa de links).
- [ ] Responsividade: breakpoints alinhados a **NF-03** (desktop, tablet, mobile).
- [ ] Acessibilidade: checklist **NF-11** (contraste, foco, labels).

---

## 5. Atualização

Ao fechar mockup de uma tela, referenciar **RF-*** afins neste arquivo ou em comentário no Figma para manter rastreabilidade.
