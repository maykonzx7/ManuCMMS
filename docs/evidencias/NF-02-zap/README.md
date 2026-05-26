# NF-02 — Segurança (HTTPS + ZAP)

## Pré-requisito

Frontend publicado em **HTTPS** — [HOMOLOG-URL.md](../../HOMOLOG-URL.md).

## Execução

```bash
TARGET_URL=https://seu-frontend.vercel.app ./scripts/nf-zap-baseline.sh
```

Relatórios gerados nesta pasta: `zap-baseline-report.html`, `zap-baseline-report.json`.

## Critério DDE

Sem vulnerabilidades **High** ou **Critical** não mitigadas no baseline.
