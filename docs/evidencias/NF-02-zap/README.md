# NF-02 — Segurança (HTTPS + ZAP)

## Pré-requisito

Frontend publicado em **HTTPS** — [HOMOLOG-URL.md](../../HOMOLOG-URL.md).

## Execução

```bash
TARGET_URL=https://seu-frontend.vercel.app ./scripts/nf-zap-baseline.sh
```

Relatórios gerados nesta pasta: `zap-baseline-report.html`, `zap-baseline-report.json`.

## Última execução (08/06/2026)

- Alvo: `https://manucmms.vercel.app`
- **FAIL:** 0 (High/Critical)
- **WARN:** 11 (cabeçalhos de cache, Permissions-Policy, COEP — típicos de SPA Next.js/Vercel)
- **PASS:** 56
- Relatórios: `zap-baseline-report.html`, `zap-baseline-report.json`
- Log: `execucao-2026-06-08.log`

## Critério DDE

Sem vulnerabilidades **High** ou **Critical** não mitigadas no baseline.
