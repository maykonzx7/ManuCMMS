# Evidências NF — ManuCMMS

Pasta de artefatos para verificação dos requisitos não funcionais (DDE / ERS).

**Última coleta automatizada:** 26/05/2026

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
| NF-01 | [NF-01-performance/](NF-01-performance/) | **curl** — `resumo-tempo-resposta.json` (sem Lighthouse) |
| NF-03 | [NF-03-responsividade.md](NF-03-responsividade.md) | Matriz de viewports + checklist manual |
| NF-04 | [NF-04-health/](NF-04-health/) | **Coletado** — health com RabbitMQ up/down |
| NF-05 | [NF-05-auditoria/](NF-05-auditoria/) | **Coletado** — amostra MongoDB |
| NF-08 | [NF-08-circuit-breaker.md](NF-08-circuit-breaker.md) | Teste unitário + procedimento UI |
| NF-10 | [NF-10-backup-restore.md](NF-10-backup-restore.md) | Política e simulação documentada |
| NF-11 | [NF-11-a11y/](NF-11-a11y/) | **Manual** — axe DevTools (sem Lighthouse) |

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
| [scripts/homolog/check-homolog.sh](../../scripts/homolog/check-homolog.sh) | Deploy |

## Pendências externas (homologação HTTPS)

Preencher [HOMOLOG-URL.md](../HOMOLOG-URL.md) e executar:

- NF-02: `./scripts/nf-zap-baseline.sh`
- NF-06: `k6 run -e API_BASE_URL=... scripts/nf-k6-load.js`
- NF-07: monitor de uptime (UptimeRobot, Better Stack, etc.)
