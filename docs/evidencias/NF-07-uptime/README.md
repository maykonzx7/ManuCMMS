# NF-07 — Disponibilidade (uptime)

**Última sonda:** 08/06/2026  
**Alvo:** `https://manucmms.onrender.com/health`

## Resultado da sonda (10 probes, intervalo 3s)

| Métrica | Valor |
|---------|-------|
| Sucesso | 10/10 |
| Uptime | **100%** |
| Artefato | [resumo-2026-06-08.json](resumo-2026-06-08.json) |

## Monitor contínuo (recomendado para defesa)

Cadastrar em [UptimeRobot](https://uptimerobot.com) ou similar:

- URL: `https://manucmms.onrender.com/health`
- Intervalo: 5 min
- Alerta: e-mail se HTTP ≠ 200

## Regenerar

```bash
API_BASE_URL=https://manucmms.onrender.com PROBES=20 ./scripts/nf-uptime-probe.sh
```
