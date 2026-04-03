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

- [ ] Wireframes das telas: login, lista OS, detalhe OS, cadastro ativo, dashboard, auditoria.
- [ ] Mockups com identidade visual e estados (loading, erro, vazio).
- [ ] Fluxo de navegação documentado (diagrama ou mapa de links).
- [ ] Responsividade: breakpoints alinhados a **NF-03** (desktop, tablet, mobile).
- [ ] Acessibilidade: checklist **NF-11** (contraste, foco, labels).

---

## 5. Atualização

Ao fechar mockup de uma tela, referenciar **RF-*** afins neste arquivo ou em comentário no Figma para manter rastreabilidade.
