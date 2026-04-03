# Manual do usuário — esqueleto (entregável DDE)

O DDE exige **manual completo** com passo a passo por perfil (**Técnico, Supervisor, Gestor, Auditor**) e permissões por unidade. Este documento define a **estrutura** a ser preenchida durante a implementação; o conteúdo final pode ser Markdown, PDF ou wiki.

---

## 1. Convenções do manual

- Um capítulo por **perfil corporativo**.
- Cada procedimento: **pré-condição** → **passos numerados** → **resultado esperado** → **RF/RN** relacionados (rodapé).
- Glossário: termos do [03-CONTEXTO-DELIMITADO-E-BOUNDED-CONTEXTS.md](03-CONTEXTO-DELIMITADO-E-BOUNDED-CONTEXTS.md).
- Screenshots atualizados na versão de homologação.

---

## 2. Capítulo — Técnico de manutenção

| Seção | Tópico | RF / RN |
| ----- | ------ | ------- |
| 2.1 | Acesso, login e recuperação de senha | RF-02 |
| 2.2 | Visualizar **minhas** ordens de serviço | RF-05, RN-03 |
| 2.3 | Aceitar / iniciar execução de OS | RF-07 |
| 2.4 | Anexar fotos e vídeos; aguardar processamento | RF-10, RN-02, RN-13 |
| 2.5 | Assinatura digital e fechamento | RN-02 |
| 2.6 | Consultar histórico do ativo (leitura) | RF-17 |
| 2.7 | Gráfico de temperatura (visualização) | RF-09 |

---

## 3. Capítulo — Supervisor

| Seção | Tópico | RF / RN |
| ----- | ------ | ------- |
| 3.1 | Visão de OS da **unidade** | RN-08 |
| 3.2 | Criar OS e atribuir técnico | RF-05 |
| 3.3 | Acompanhar status em tempo real | RF-18 |
| 3.4 | Notificações de alerta crítico | RN-09, RF-11 |
| 3.5 | Filtros e buscas | RF-12, RF-20 |

---

## 4. Capítulo — Gestor

| Seção | Tópico | RF / RN |
| ----- | ------ | ------- |
| 4.1 | Dashboard e KPIs | RF-08, RN-03 |
| 4.2 | Relatórios por período e unidade | RF-21 |
| 4.3 | Exportação PDF/Excel | RF-13 |
| 4.4 | Consulta de auditoria | RF-14 |
| 4.5 | Autorizar alteração pós-fechamento (se aplicável) | RN-15 |

---

## 5. Capítulo — Auditor

| Seção | Tópico | RF / RN |
| ----- | ------ | ------- |
| 5.1 | Navegação somente leitura em registros críticos | RF-14 |
| 5.2 | Interpretação do log (quem, quando, valor anterior) | RN-04 |
| 5.3 | Exportação de logs para conformidade externa | RN-12 |

---

## 6. Capítulo — Administrador de manutenção (Matriz)

| Seção | Tópico | RF / RN |
| ----- | ------ | ------- |
| 6.1 | Cadastro e inativação de usuários | RF-01 |
| 6.2 | Configuração de perfis e permissões por unidade | RF-16, RN-08 |
| 6.3 | Cadastro de unidades fabris | DEM |
| 6.4 | Simulação de temperatura (testes) | RF-19 |

---

## 7. Apêndices

- A. Mensagens de erro frequentes e o que fazer.
- B. Contatos e ambiente de homologação (URL).
- C. Referência rápida **permissões** (tabela do [06-DEI-NAVEGACAO-E-PERFIS.md](06-DEI-NAVEGACAO-E-PERFIS.md)).

---

## 8. Atualização

Ao mudar uma tela que impacta um passo, atualizar o capítulo correspondente na mesma sprint.
