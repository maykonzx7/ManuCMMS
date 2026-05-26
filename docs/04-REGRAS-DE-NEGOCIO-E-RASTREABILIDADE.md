# Regras de negócio, requisitos e rastreabilidade

Matriz viva: atualizar a coluna **Implementação** a cada merge relevante. Regras e requisitos conforme ERS/DDE do relatório fonte.

---

## 1. Regras de negócio (RN)

| ID | Regra (síntese) | Prioridade ERS | RF / NF relacionados | Onde vive no DDD | Implementação (preencher) |
| -- | ----------------- | -------------- | -------------------- | ---------------- | ------------------------- |
| RN-01 | Temperatura > limite (padrão 48°C) em **três leituras consecutivas** → criar OS preditiva | Essencial | RF-06, NF-08 | Domain service IoT + agregado OrdemServico | Pendente |
| RN-02 | Fechar OS só com **≥1 foto** e **assinatura digital** do técnico | Essencial | RF-07, RF-10 | OrdemServico (invariantes de fechamento) | **Implementado** — `fechar-ordem-servico.use-case.ts` (mai/2026) |
| RN-03 | Dashboard/KPIs: só **Gestor** e **Admin**; técnico só **suas** OS | Essencial | RF-08, RF-03 | IAM policies + query scopes | **Implementado** — permissão `dashboard.executivo` + home por perfil (mai/2026) |
| RN-04 | Registros críticos: **quem, quando, valor anterior** (e novo) | Essencial | RF-14, NF-05 | Porta `IAuditLog` → adapter **MongoDB** (sem tabela audit em PostgreSQL) | **Implementado** — NF-05 coletado; UI `/workspace/auditoria` |
| RN-05 | Toda OS **obrigatoriamente** vinculada a ativo existente | Essencial | RF-05 | OrdemServico + factory | **Implementado** — validação create/update OS |
| RN-06 | Limite térmico **configurável** por ativo ou grupo | Importante | RF-04 | **v1:** `Ativo.limite_temp`; grupo adiado (ver plano maestro) | Pendente (implementar limite no Ativo) |
| RN-07 | Ao consumir peças, validar **estoque** antes de fechar | Importante | RF-07 | Domain service + agregado Estoque (a modelar) | **Implementado** — tabelas `peca`/`ordem_servico_peca` + validação atômica no fechamento (mai/2026) |
| RN-08 | **Isolamento** por unidade fabril; exceção só com autorização matriz | Essencial | RF-03 | Filtro por `id_unidade` em queries e tokens | **Implementado** — `EnforceUnidadeScopeUseCase` |
| RN-09 | Alerta crítico → notificação **imediata** técnico + supervisor | Essencial | RF-11, RF-06 | Notification adapter pós-evento | **Parcial** — notificações OS/SLA; IoT adiado |
| RN-10 | Ativo em manutenção **não** entra em nova OS de “produção” até finalizar OS | Essencial | RF-04, RF-05 | Ativo.status + política de abertura | **Implementado** — política na abertura de OS |
| RN-11 | Registrar **tempo de execução** (início → fechamento) | Importante | RF-07 | OrdemServico (timestamps / value object) | **Implementado** — timestamps início/fim |
| RN-12 | Exportação completa de **logs de auditoria** | Importante | RF-13, RF-14 | Endpoint/use case leitura audit | **Implementado** — `GET /auditoria/export` CSV |
| RN-13 | OS **corretiva**: foto do **problema** e da **solução** obrigatórias | Essencial | RF-07 | OrdemServico tipo Corretiva | **Implementado** — validação no fechamento |
| RN-14 | Ao finalizar OS → atualizar **status do ativo** (ex.: manutenção → operacional) | Essencial | RF-07 | Transação ou evento AtualizarAtivo | **Implementado** — fechamento atualiza ativo |
| RN-15 | Após fechamento, **sem alteração** nos dados principais sem **Gestor** | Essencial | RF-07 | Estado Concluída + comando restrito | **Implementado** — `update-ordem-servico.use-case.ts` (mai/2026) |
| RN-16 | **Admin da empresa cliente não** pode executar onboarding global de empresas | Essencial | RF-01, RF-03, NF-02 | Guard de plataforma (`x-platform-admin-key`) separado do RBAC da empresa | Implementado no backend (`POST /empresas`) |

---

## 2. Requisitos funcionais (RF) — mapa rápido por módulo

| ID | Módulo | Essência | Dependência dominante |
| -- | ------ | -------- | ------------------------ |
| RF-01 | IAM | CRUD usuários | Unidade, perfil |
| RF-02 | IAM | Login, logout, recuperação senha | Supabase Auth | **Implementado** — fluxo self-service + `/workspace/acesso/redefinir-senha` (mai/2026) |
| RF-03 | IAM | RBAC + unidade | RN-08 |
| RF-04 | Core | Ativos + histórico | Unidade |
| RF-05 | Core | OS manual | Ativo, técnico |
| RF-06 | IoT/Fila | OS automática | RN-01, RabbitMQ |
| RF-07 | Core | Execução e fechamento | RN-02, RN-13, RN-14, RN-15 |
| RF-08 | Analytics | Dashboard KPIs | Dados OS/Ativo |
| RF-09 | Analytics/IoT | Gráfico temp. tempo real | WebSocket + telemetria |
| RF-10 | Core | Upload grande assíncrono | Storage, fila |
| RF-11 | Mensageria | Notificações tempo real | WebSocket/push | **Implementado** — namespace `/realtime`, evento `notificacao.nova` (mai/2026) |
| RF-12 | Core | Filtros avançados | Specification / query | **Implementado** — query params server-side em listagem OS (mai/2026) |
| RF-13 | Analytics | PDF/Excel | RF-21 relacionado |
| RF-14 | Compliance | Consulta auditoria | Log persistido |
| RF-15 | Integração | API parceiro + webhook outbound | NF-08, circuit breaker | **Implementado** — `IntegracaoParceiroController` + webhook assíncrono (substitui Airtable; mai/2026) |
| RF-16 | IAM | Perfis/permissões | RF-03 |
| RF-17 | Core | Histórico por ativo | Agregações leitura | **Implementado** — `GET .../ativos/:id/ordens-servico` + UI (mai/2026) |
| RF-18 | Core | Status OS tempo real | WebSocket | **Implementado** — evento `ordem_servico.status` (mai/2026) |
| RF-20 | Core | Consulta OS filtros | RF-12 | **Implementado** — mesmos filtros server-side (mai/2026) |
| RF-21 | Analytics | Relatório por período/unidade | RN-08 |

_Itens marcados como “Importante” no ERS (ex.: RF-12, RF-13, RF-19, RF-20, RF-21) podem ser planejados após o núcleo essencial._

---

## 3. Requisitos não funcionais (NF) — verificação

| ID | Verificação sugerida | Implementação (preencher) |
| -- | -------------------- | ------------------------- |
| NF-01 | Lighthouse/GTmetrix em dashboard e lista OS | **Script + procedimento** — `docs/evidencias/NF-01-lighthouse/` |
| NF-02 | HTTPS, fluxo OIDC, checagem OWASP ZAP | Pendente homologação HTTPS |
| NF-03 | Testes responsivos multi-dispositivo | **Matriz** — `docs/evidencias/NF-03-responsividade.md` |
| NF-04 | Health endpoints + teste queda RabbitMQ | **Coletado** — `docs/evidencias/NF-04-health/` |
| NF-05 | Consulta audit com quem/quando/valor anterior | **Coletado** — `docs/evidencias/NF-05-auditoria/` |
| NF-06 | Carga 50 usuários (ferramenta a definir) | **Script** — `scripts/nf-k6-load.js` (executar em homolog) |
| NF-07 | Monitoramento uptime homologação | **Procedimento** — UptimeRobot + `HOMOLOG-URL.md` |
| NF-08 | Circuit breaker / resiliência integrações | **Coletado** — teste unitário + `docs/evidencias/NF-08-circuit-breaker.md` |
| NF-09 | Teste upload limite 800 MB | Pendente |
| NF-10 | Backup automático (provedor DB + política) | **Política + dump** — `docs/evidencias/NF-10-backup-restore.md` |
| NF-11 | Auditoria WCAG 2.1 AA (axe/lighthouse) | **Via Lighthouse** — pasta NF-01 |
| NF-12 | Logs centralizados / estruturados | Pendente |

---

## 4. Invariantes do modelo (DEM)

- `Usuario.id_unidade` obrigatório; `email` único.
- `Ativo.limite_temp` com default 48°C (**RN-06** / exemplo ORM no DEM).
- `OrdemServico.id_ativo` obrigatório (**RN-05**).
- `LogAuditoria`: entidade, id registro, JSON anterior/novo, timestamp.

---

## 5. Rotina de atualização

1. Implementou regra → marcar **Implementação** com: módulo, arquivo ou use case principal, data.
2. Alterou semântica → atualizar RN e referências RF.
3. Divergência com relatório acadêmico → refletir também no `V2...md` na próxima revisão formal do relatório.

---

## 6. Onde detalhar implementação fora desta matriz

| Tema | Documento |
| ---- | --------- |
| Telas e permissões por perfil (aceitação UX) | [06-DEI-NAVEGACAO-E-PERFIS.md](06-DEI-NAVEGACAO-E-PERFIS.md) |
| Endpoints e eventos em tempo real | [07-API-REST-E-CONTRATOS.md](07-API-REST-E-CONTRATOS.md) |
| Evidências de NF (Lighthouse, ZAP, carga, a11y) | [08-ESTRATEGIA-DE-TESTES-SEGURANCA-E-NF.md](08-ESTRATEGIA-DE-TESTES-SEGURANCA-E-NF.md) |
| Peças, estoque, grupo de ativos, BPMN | [11-MODELO-DADOS-ESTENDIDO-E-BPMN.md](11-MODELO-DADOS-ESTENDIDO-E-BPMN.md) |
