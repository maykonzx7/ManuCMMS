# STATUS DOS MODULOS OBRIGATORIOS (DDE)

Atualizado em: **09/06/2026**

## 1) IAM (Gestao de Identidade) - 94%

- Implementado:
  - Login/logout com Supabase + sessao por cookie HttpOnly (`/auth/session`).
  - Resolucao de login por identificador (`/auth/resolve-login`).
  - Recuperacao de senha self-service (Supabase + `/workspace/acesso/redefinir-senha`).
  - RBAC por perfil e permissao no backend.
  - Escopo por unidade com validacoes server-side.
  - Permissao `dashboard.executivo` (RN-03) — KPIs restritos a Gestor/Admin.
  - Gestao de usuarios/convites/perfis/cargos.
- Pendente para 100%:
  - Endurecimento adicional de sessao (rotacao/expiracao configuravel por risco).

## 2) Core Business (Dominio) - 100%

- Implementado:
  - CRUD de unidades, ativos e ordens de servico.
  - Foto principal do ativo (upload/remocao) + documentos tecnicos.
  - Assinatura digital obrigatoria no fechamento (RN-02).
  - Estoque/pecas com consumo no fechamento (RN-07).
  - **Relatorio PDF/CSV de estoque** — `GET /unidades/:id/pecas/export?formato=pdf|csv`.
  - Historico de OS por ativo (RF-17).
  - Bloqueio pos-fechamento (RN-15).
  - Filtros server-side na listagem de OS (RF-12/RF-20).
  - Prioridade de OS no schema e UI.
  - **Testes unitarios RN criticas:** `npm run test:critical` — ≥80% linhas nos use cases cobertos.

## 3) Comunicacao e Eventos (Messageria) - 88%

- Implementado:
  - RabbitMQ e Redis operacionais via Docker.
  - Notificacoes internas de OS; WebSocket `/realtime` (RF-11, RF-18).
  - Webhook outbound + circuit breaker; API parceiro (`x-api-key`).
  - Envio de email com link direto para a OS.
- Pendente para 100%:
  - Fluxo IoT completo (RN-01) — **adiado** ([IoT-ESCOPO-DDE.md](IoT-ESCOPO-DDE.md)).

## 4) Inteligencia de Dados (Dashboard Executivo) - 80%

- Implementado:
  - KPIs executivos (`/dashboard/executivo`); home Tecnico vs Gestor.
  - Exportacoes de relatorios; API parceiro com KPIs por unidade.
- Pendente para 100%:
  - Grafico de temperatura IoT (RF-09) — **adiado**.

## 5) Auditoria e Log (transversal) - 85%

- Implementado:
  - Persistencia dual (Postgres + Mongo); UI consulta e export CSV.
  - Health checks; coleta NF automatizada.

---

## Verificacao NF — **concluida** (09/06/2026)

| NF | Status | Artefato |
|----|--------|----------|
| NF-01 | OK | [evidencias/NF-01-performance/](evidencias/NF-01-performance/) |
| NF-02 | OK — 0 High/Critical | [evidencias/NF-02-zap/](evidencias/NF-02-zap/) |
| NF-03 | OK — 11 screenshots | [evidencias/NF-03-screenshots/](evidencias/NF-03-screenshots/) |
| NF-04 | OK | [evidencias/NF-04-health/](evidencias/NF-04-health/) |
| NF-05 | OK | [evidencias/NF-05-auditoria/](evidencias/NF-05-auditoria/) |
| NF-06 | OK — 50 VUs local | [evidencias/NF-06-k6/](evidencias/NF-06-k6/) |
| NF-07 | OK — 100% na sonda | [evidencias/NF-07-uptime/](evidencias/NF-07-uptime/) |
| NF-08 | OK — teste unitario | [evidencias/NF-08-circuit-breaker.md](evidencias/NF-08-circuit-breaker.md) |
| NF-10 | OK | [evidencias/NF-10-backup/](evidencias/NF-10-backup/) |
| NF-11 | OK — 0 critical/serious | [evidencias/NF-11-a11y/](evidencias/NF-11-a11y/) |

**Testes:** `npm test` (47 testes) + `npm run test:critical` (80%+ linhas RN criticas).

**Homologacao:** [HOMOLOG-URL.md](HOMOLOG-URL.md) — Vercel + Render validados.

**Regenerar tudo:** `./scripts/prod/collect-nf-dde.sh` (com URLs HTTPS exportadas).

---

## Resumo geral

- Cobertura dos 4 modulos obrigatorios: **~92%**
- Checklist DDE 1.9: **completo** exceto IoT (substituido por API parceiro + webhook)
- Risco residual para defesa:
  - IoT preditivo (escopo adiado, documentado)
  - Redeploy Vercel para a11y + PDF estoque em homolog
  - Screenshot UptimeRobot opcional — [MONITOR-EXTERNO.md](evidencias/NF-07-uptime/MONITOR-EXTERNO.md) (sonda NF-07 ja atende critério)
