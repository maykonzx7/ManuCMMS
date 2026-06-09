# NF-07 — Disponibilidade (uptime)

**Última sonda:** 08/06/2026  
**Alvo:** `https://manucmms.onrender.com/health`

## Resultado da sonda (10 probes, intervalo 3s)

| Métrica | Valor |
|---------|-------|
| Sucesso | 10/10 |
| Uptime | **100%** |
| Artefato | [resumo-2026-06-08.json](resumo-2026-06-08.json) |

## Monitor contínuo

Guia passo a passo: [MONITOR-EXTERNO.md](MONITOR-EXTERNO.md) (UptimeRobot).

A sonda automatizada já atende o critério NF-07 (>99%). O monitor externo é complemento visual para a defesa.

## Regenerar

```bash
API_BASE_URL=https://manucmms.onrender.com PROBES=20 ./scripts/nf-uptime-probe.sh
```
