# Evidências NF — ManuCMMS

Pasta de artefatos para verificação dos requisitos não funcionais (DDE / ERS).

**Última coleta automatizada:** 09/06/2026

## Como regenerar

```bash
docker compose up -d   # ou ./scripts/prod/up.sh
cd frontend && npm run build && npx next start -p 3001 &

chmod +x scripts/collect-nf-evidence.sh scripts/prod/collect-nf-dde.sh
./scripts/prod/collect-nf-dde.sh
```

## Índice

| NF | Pasta / arquivo | Status |
|----|-----------------|--------|
| NF-01 | [NF-01-performance/](NF-01-performance/) | **OK 08/06** — TTFB < 2s (Vercel homolog) |
| NF-02 | [NF-02-zap/](NF-02-zap/) | **OK 08/06** — 0 High/Critical (11 WARN) |
| NF-03 | [NF-03-screenshots/](NF-03-screenshots/) | **OK 08/06** — 11 capturas Playwright |
| NF-04 | [NF-04-health/](NF-04-health/) | **OK 08/06** — health com RabbitMQ up/down |
| NF-05 | [NF-05-auditoria/](NF-05-auditoria/) | **OK 08/06** — amostra MongoDB |
| NF-06 | [NF-06-k6/](NF-06-k6/) | **OK 08/06** — 50 VUs local; homolog Render documentado |
| NF-08 | [NF-08-circuit-breaker.md](NF-08-circuit-breaker.md) | Teste unitário + procedimento UI |
| NF-10 | [NF-10-backup-restore.md](NF-10-backup-restore.md) | **OK 08/06** — pg_dump + mongodump |
| NF-07 | [NF-07-uptime/](NF-07-uptime/) | **OK 08/06** — sonda 100% (10 probes) |
| NF-11 | [NF-11-a11y/](NF-11-a11y/) | **OK 09/06** — axe 0 critical/serious |

## Testes automatizados relacionados

```bash
cd backend
npm test
RUN_DB_E2E=1 npm run test:e2e
```

## Scripts

| Script | NF |
|--------|-----|
| [scripts/collect-nf-evidence.sh](../../scripts/collect-nf-evidence.sh) | NF-01, 04, 05, 10 |
| [scripts/prod/collect-nf-dde.sh](../../scripts/prod/collect-nf-dde.sh) | Orquestração completa |
| [scripts/capture-nf03-screenshots.sh](../../scripts/capture-nf03-screenshots.sh) | NF-03 (opcional) |
| [scripts/nf-zap-baseline.sh](../../scripts/nf-zap-baseline.sh) | NF-02 |
| [scripts/nf-k6-load.js](../../scripts/nf-k6-load.js) | NF-06 |
| [scripts/nf-uptime-probe.sh](../../scripts/nf-uptime-probe.sh) | NF-07 |
| [scripts/nf-playwright-screenshots.mjs](../../scripts/nf-playwright-screenshots.mjs) | NF-03 |
| [scripts/nf-axe-playwright.mjs](../../scripts/nf-axe-playwright.mjs) | NF-11 |
| [scripts/homolog/check-homolog.sh](../../scripts/homolog/check-homolog.sh) | Deploy |

## Testes RN críticas

```bash
cd backend && npm run test:critical
```

## Opcional pós-deploy

- Cadastrar monitor contínuo UptimeRobot em `/health` (complementa sonda NF-07)
