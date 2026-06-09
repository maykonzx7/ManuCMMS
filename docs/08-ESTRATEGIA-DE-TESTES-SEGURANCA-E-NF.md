# Estratégia de testes, segurança e verificação dos NF

Consolida os **critérios de medição** explícitos no ERS que ainda não tinham um plano único de execução.

---

## 1. Pirâmide de testes e meta de cobertura

| Nível | Escopo | Objetivo no ManuCMMS |
| ----- | ------ | --------------------- |
| Unitário | Entidades, domain services, value objects | Invariantes **RN-*** sem I/O. |
| Integração | Repositórios, consumer RabbitMQ, cliente Airtable (mock ou sandbox) | **RF-06**, **RF-15**, **NF-08**. |
| E2E (poucos) | Fluxos críticos: login, criar OS, fechar com anexo, IoT→OS | Critérios DDE 1.9. |
| Contrato | Schema API / mensagens fila | Evolução sem quebrar clientes. |

**DDE / aceitação:** cobertura mínima **80%** nas **regras de negócio críticas** (interpretação: domínio + serviços que implementam **RN** essenciais e transições de OS). Medir com ferramenta do ecossistema (ex.: c8, istanbul via Vitest/Jest).

---

## 2. Mapeamento NF → evidência

| NF | Evidência esperada | Ferramenta / método (explícito no relatório) |
| -- | ------------------ | --------------------------------------------- |
| NF-01 | Tempo de resposta HTTP + opcional GTmetrix manual | curl (script) | **Script pronto** — [evidencias/NF-01-performance/README.md](evidencias/NF-01-performance/README.md) |
| NF-02 | Relatório OWASP ZAP + evidência HTTPS/OIDC | OWASP ZAP | **Coletado 08/06** — [evidencias/NF-02-zap/](evidencias/NF-02-zap/) (0 High/Critical) |
| NF-03 | Matriz de dispositivos testados ou screenshots | Playwright | **OK 08/06** — [evidencias/NF-03-screenshots/](evidencias/NF-03-screenshots/) |
| NF-04 | Logs de health check + teste com RabbitMQ parado | Scripts manuais/automáticos | **Coletado** — [evidencias/NF-04-health/](evidencias/NF-04-health/) |
| NF-05 | Consulta a log com quem/quando/valor anterior | Verificação manual na **coleção MongoDB** de auditoria (PostgreSQL não substitui esta evidência) | **Coletado** — [evidencias/NF-05-auditoria/](evidencias/NF-05-auditoria/) |
| NF-06 | Relatório de carga 50 usuários | k6 | **Coletado 08/06** — [evidencias/NF-06-k6/](evidencias/NF-06-k6/) (local OK) |
| NF-07 | Uptime homologação > 99% | Sonda + monitor externo | **OK 08/06** — [evidencias/NF-07-uptime/](evidencias/NF-07-uptime/) (100% na sonda) |
| NF-08 | Métricas de fila sob carga | RabbitMQ management + testes | **Circuit breaker webhook** — [evidencias/NF-08-circuit-breaker.md](evidencias/NF-08-circuit-breaker.md) + teste unitário |
| NF-09 | Upload 800 MB completo com sucesso | Teste manual ou automatizado longo |
| NF-10 | Política de backup + simulação de restore | Documento + evidência do provedor | **Política + dump local** — [evidencias/NF-10-backup-restore.md](evidencias/NF-10-backup-restore.md) |
| NF-11 | Relatório axe nos fluxos críticos | axe-core + Playwright | **OK 09/06** — [evidencias/NF-11-a11y/](evidencias/NF-11-a11y/) (0 critical/serious) |
| NF-12 | Amostra de logs estruturados em homologação | Stack de logging |

Armazenar evidências na pasta `docs/evidencias/` (ou repositório separado) com data.

**Última atualização:** 09/06/2026 — NF-01 a NF-11 evidenciados. Testes RN: `cd backend && npm run test:critical` (≥80% linhas nos use cases críticos).

---

## 3. Segurança (além do ZAP)

- Validação de entrada em todos os DTOs (class-validator ou equivalente).
- Rate limiting em rotas públicas (login, recuperação senha, ingestão IoT se exposta).
- Segredos apenas em variáveis de ambiente; nunca no Git.
- Revisão de dependências (npm audit / Dependabot) na CI.
- Separar privilégios de **Admin da Empresa** e **Administrador da Plataforma** em testes automatizados.

### 3.1 Casos mínimos obrigatórios de autorização

- `GET /me` sem vínculo local deve retornar `403` (acesso somente por convite/vínculo válido).
- `POST /empresas` sem `x-platform-admin-key` deve retornar `403`.
- `POST /empresas` com `x-platform-admin-key` válida deve permitir onboarding.

---

## 4. Testes de resiliência (cenários mínimos)

1. RabbitMQ indisponível: API continua degradada com fila local ou erro controlado (**NF-04**).
2. Airtable indisponível: OS concluída persiste; sync retenta; operador pode reprocessar manualmente.
3. Arduino offline: simulação **RF-19** ainda gera OS para demo.

---

## 5. Atualização

Após cada sprint de QA, anexar resumo de cobertura e links para relatórios NF neste arquivo ou em `docs/evidencias/README.md`.
