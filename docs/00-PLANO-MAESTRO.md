# Plano maestro de desenvolvimento — ManuCMMS

Documento de governança técnica derivado do **DDE, ERS, DEM** e premissas explícitas no relatório `V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA.md`. Objetivo: permitir execução por fases, rastreabilidade total (RF, NF, RN) e **atualização contínua** após cada entrega.

---

## 1. Visão do produto (síntese explícita)

- **CMMS corporativo** com IoT (Arduino ou ESP32 + DHT22), foco em temperatura.
- **Quatro módulos obrigatórios:** IAM, Core Business (ativos e OS), Mensageria/Eventos, Inteligência de Dados (dashboard).
- **Arquitetura:** hexagonal + **DDD**; **TypeScript** exclusivo no frontend e backend.
- **Integrações reais:** API REST com **Airtable** (ERP simulado), **RabbitMQ** para fluxos assíncronos, **Supabase** para autenticação segura em homologação.
- **Deploy alvo:** Vercel (frontend), Railway (backend), HTTPS, Docker Compose local, CI/CD com GitHub Actions (mitigação de risco explícita).
- **Prazo fixo:** entrega final **02/07/2026** (restrição do DDE).

---

## 2. O que construir primeiro (ordem lógica de dependência)

A sequência abaixo respeita dependências técnicas e critérios de aceitação do DDE (sem as quais o restante não pode ser validado).

| Ordem | Bloco | Justificativa |
| :---: | ----- | ------------- |
| 1 | **Fundação do repositório** | Monorepo ou multirepo com Git, Docker Compose (app, RabbitMQ, serviços de dados), variáveis de ambiente, pipeline CI mínima (build + testes). |
| 2 | **IAM + multi-tenant por unidade fabril** | RBAC, isolamento **RN-08** e auditoria **RN-04** dependem de identidade e contexto de unidade. Supabase Auth alinhado a **NF-02** (OAuth2/OIDC). |
| 3 | **Core: Unidade fabril, Ativo, OS (domínio)** | Agregados centrais do DEM; **RN-05**, estados da OS, **RN-02**, **RN-13**, **RN-14**, **RN-15**. |
| 4 | **Auditoria persistida** | Critério de aceitação e **NF-05**; bloqueia conformidade antes de escalar funcionalidades. |
| 5 | **Mensageria: eventos IoT → fila → criação de OS preditiva** | **RF-06**, **RN-01**, **RN-09**; exige Core mínimo de Ativo/OS. |
| 6 | **Tempo real (WebSocket)** | **RF-09**, **RF-11**, **RF-18**; pode evoluir em paralelo ao item 5 após API core estável. |
| 7 | **Upload assíncrono (até 800 MB)** | **RF-10**, **NF-09**; acoplado ao fechamento de OS (**RN-02**). |
| 8 | **Dashboard e KPIs (Recharts)** | **RF-08**; depende de dados históricos de OS e ativos + regras **RN-03**. |
| 9 | **Integração Airtable (assíncrona)** | **RF-15**, **NF-08**; disparar após OS concluída com resiliência (circuit breaker). |
| 10 | **Simulação de temperatura (RF-19)** | Mitigação de risco de hardware; não bloqueia o núcleo, mas deve existir antes da defesa. |
| 11 | **Busca, filtros, relatórios e exportações** | **RF-12**, **RF-13**, **RF-20**, **RF-21**, **RN-12** (prioridade importante onde indicado). |
| 12 | **Hardening** | Health checks e circuit breaker **NF-04**, testes até **80%** nas regras críticas, acessibilidade **NF-11**, performance **NF-01**. |

Detalhamento temporal e marcos: ver [05-CRONOGRAMA-E-FASES.md](05-CRONOGRAMA-E-FASES.md).

---

## 3. Como amarrar cada tópico às alterações (processo obrigatório)

1. **Antes de codificar:** identificar RF/NF/RN afetados; se nova decisão divergir do relatório, registrar em seção “Decisões e derivações” (abaixo).
2. **No PR / commit:** referenciar identificadores (`RF-07`, `RN-02`, etc.) na mensagem ou descrição.
3. **Após merge:** atualizar:
   - [04-REGRAS-DE-NEGOCIO-E-RASTREABILIDADE.md](04-REGRAS-DE-NEGOCIO-E-RASTREABILIDADE.md) — status da regra ou requisito.
   - Este arquivo — **Changelog** (entrada datada).
   - [05-CRONOGRAMA-E-FASES.md](05-CRONOGRAMA-E-FASES.md) — marcar item ou ajustar datas.
4. **Modelagem:** qualquer mudança em entidades do DEM exige atualização do dicionário de dados (mesmo arquivo de especificação ou diagrama PlantUML do apêndice).

### 3.1 Lacunas do relatório agora endereçadas em `docs/`

| Tópico no sumário / entregável | Documento |
| ------------------------------- | --------- |
| DEI (wireframes, mockups, navegação) | [06-DEI-NAVEGACAO-E-PERFIS.md](06-DEI-NAVEGACAO-E-PERFIS.md) |
| APIs, integrações, caracterização | [07-API-REST-E-CONTRATOS.md](07-API-REST-E-CONTRATOS.md) |
| Boas práticas / verificação NF | [08-ESTRATEGIA-DE-TESTES-SEGURANCA-E-NF.md](08-ESTRATEGIA-DE-TESTES-SEGURANCA-E-NF.md) |
| Infraestrutura, repositório, observabilidade | [09-INFRAESTRUTURA-OBSERVABILIDADE-E-BACKUP.md](09-INFRAESTRUTURA-OBSERVABILIDADE-E-BACKUP.md) |
| Manual do usuário (§6) | [10-MANUAL-DO-USUARIO-ESQUELETO.md](10-MANUAL-DO-USUARIO-ESQUELETO.md) |
| ORM, modelo estendido, BPMN §3.5 | [11-MODELO-DADOS-ESTENDIDO-E-BPMN.md](11-MODELO-DADOS-ESTENDIDO-E-BPMN.md) |

---

## 4. Escopo fora do produto (não implementar nesta versão)

Conforme DDE: app mobile nativo, múltiplos sensores além temperatura, ML real para predição, SAP/TOTVS, módulo financeiro completo.

---

## 5. Decisões e derivações (preencher ao implementar)

| Data | Tema | Decisão | Impacto em RF/NF/RN |
| ---- | ---- | ------- | --------------------- |
| 2026-04-03 | ORM | **Prisma 5** no backend (`prisma/schema.prisma`, migrações versionadas). | RF-01 base, unidade/usuário. |
| 2026-04-03 | Persistência dual | **PostgreSQL** (Supabase): dados transacionais do DEM — Unidade, Usuario (perfil), Ativo, OrdemServico, extensões RN-06/RN-07. **MongoDB**: trilha de auditoria (**RN-04**, **NF-05**), coleção alinhada ao dicionário `LogAuditoria` (campos equivalentes em documento BSON). Dois adaptadores na infra; porta `IAuditLog` só Mongo; repositórios de negócio em SQL. | NF-05, RN-04, RF-14, RN-12; health check deve validar os dois backends. |
| _—_ | Estoque (**RN-07**) | Regra “importante”; pode exigir entidade `Peça`/`Estoque` não detalhada no DEM mínimo — modelar extensão. | RN-07, RF-07 fechamento. |
| _—_ | Autenticação do dispositivo IoT | POST de leitura exige API key, mTLS ou segredo por ativo; documentar em [07-API-REST-E-CONTRATOS.md](07-API-REST-E-CONTRATOS.md). | NF-02, RF-06 |
| _—_ | Storage de objetos (800 MB) | Supabase Storage, S3-compatible ou disco em dev; não guardar binário grande no Postgres. | NF-09, RF-10 |
| 2026-04-03 | Limite térmico **RN-06** (v1) | **Só por ativo:** campo `limite_temp` no agregado/tabela `Ativo` (default 48 °C). Entidade `GrupoAtivo` / N:N **não** entra na v1; reavaliar se surgir necessidade de limite compartilhado por conjunto. | RN-06, RF-04 |

---

## 6. Changelog do plano

| Data | Alteração |
| ---- | --------- |
| 2026-04-03 | Criação do plano maestro e pacote inicial de documentação em `docs/`. |
| 2026-04-03 | Acrescentados DEI, API/contratos, testes/NF, infra/backup, manual (esqueleto), modelo estendido e BPMN narrativo (`06`–`11`). |
| 2026-04-03 | Decisão: uso **simultâneo** de PostgreSQL (transacional) e MongoDB (auditoria). |
| 2026-04-03 | CI GitHub Actions: `.github/workflows/ci-backend.yml` (lint, build, test, e2e). |
| 2026-04-03 | **Supabase Auth:** validação JWT (HS256) no Nest; guard global + `@Public()`; `GET /me`. |
| 2026-04-03 | **Prisma:** `UnidadeFabril`, `Usuario` (`auth_sub`); seed Matriz; `GET /unidades`; CI com serviços Docker. |
| 2026-04-03 | **RN-06 v1:** limite térmico apenas no **Ativo**; sem `GrupoAtivo` na primeira modelagem. |
| 2026-04-03 | **Prisma / API:** modelo `Ativo` (`StatusAtivo`, `limite_temp` default 48); `GET`/`POST` `unidades/:unidadeId/ativos`; seed com ativo dev; migração `20260403230000_ativo`. |
| 2026-04-03 | **Ordem de serviço:** `TipoOrdemServico`, `StatusOrdemServico`; tabela `ordem_servico` (FK ativo, técnico opcional); `GET`/`POST` `unidades/:unidadeId/ordens-servico`; portas `IUsuarioReadPort`, `IOrdemServicoRepositoryPort`; seed com OS preditiva dev; migração `20260403231000_ordem_servico`. |
| 2026-04-03 | **Fechamento OS:** `foto_problema`/`foto_solucao` (RN-13); `PATCH .../ordens-servico/:id/fechar` (RN-02, RN-14 — transação OS `CONCLUIDA` + ativo `OPERACIONAL`); migração `20260403232000_ordem_servico_fotos_rn13`. |
| 2026-04-03 | **Ciclo OS:** `PATCH .../iniciar` (ABERTA→EM_EXECUCAO), `PATCH .../cancelar`; criação OS em transação com ativo `MANUTENCAO` (RN-10 bloqueia nova OS se manutenção); auditoria Mongo `log_auditoria` (`AuditModule`, RN-04/NF-12). |
