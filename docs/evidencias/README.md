# Evidências NF — ManuCMMS

Pasta de artefatos para verificação dos requisitos não funcionais (DDE / ERS).

**Última coleta automatizada:** 26/05/2026

## Como regenerar

```bash
# Subir stack
docker compose up -d
cd backend && npm run start:prod &
cd frontend && npx next start -p 3001 &

# Coletar evidências (Lighthouse = Chromium headless; Firefox do dia a dia não basta)
chmod +x scripts/collect-nf-evidence.sh
./scripts/collect-nf-evidence.sh
```

## Índice

| NF | Pasta / arquivo | Status |
|----|-----------------|--------|
| NF-01 | [NF-01-lighthouse/](NF-01-lighthouse/) | Script pronto; relatórios HTML/JSON após execução com Chrome |
| NF-03 | [NF-03-responsividade.md](NF-03-responsividade.md) | Matriz de viewports + checklist manual |
| NF-04 | [NF-04-health/](NF-04-health/) | **Coletado** — health com RabbitMQ up/down |
| NF-05 | [NF-05-auditoria/](NF-05-auditoria/) | **Coletado** — amostra MongoDB com valor anterior/novo |
| NF-08 | [NF-08-circuit-breaker.md](NF-08-circuit-breaker.md) | Teste unitário + procedimento UI |
| NF-10 | [NF-10-backup-restore.md](NF-10-backup-restore.md) | Política e simulação documentada |
| NF-11 | Mesmos relatórios Lighthouse (categoria **accessibility**) | Ver NF-01 |

## Testes automatizados relacionados

```bash
cd backend
npm test                                    # inclui circuit breaker NF-08
RUN_DB_E2E=1 npm run test:e2e              # 32 cenários incl. integração/API key
```

## Scripts

| Script | NF |
|--------|-----|
| [scripts/collect-nf-evidence.sh](../../scripts/collect-nf-evidence.sh) | NF-01, 04, 05, 10 |
| [scripts/capture-nf03-screenshots.sh](../../scripts/capture-nf03-screenshots.sh) | NF-03 |
| [scripts/nf-zap-baseline.sh](../../scripts/nf-zap-baseline.sh) | NF-02 |
| [scripts/nf-k6-load.js](../../scripts/nf-k6-load.js) | NF-06 |
| [scripts/homolog/check-homolog.sh](../../scripts/homolog/check-homolog.sh) | Deploy |

CI: `.github/workflows/ci-lighthouse.yml` gera artefatos NF-01 no GitHub Actions.

## Pendências externas (homologação HTTPS)

Preencher [HOMOLOG-URL.md](../HOMOLOG-URL.md) e executar:

- NF-02: `./scripts/nf-zap-baseline.sh`
- NF-06: `k6 run -e API_BASE_URL=... scripts/nf-k6-load.js`
- NF-07: monitor de uptime (UptimeRobot, Better Stack, etc.)
