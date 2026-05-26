# NF-07 — Monitoramento de uptime

## Procedimento (homologação)

1. Criar monitor HTTP em [UptimeRobot](https://uptimerobot.com) ou Better Stack.
2. URL: `https://SUA-API/health` (ver [HOMOLOG-URL.md](../../HOMOLOG-URL.md)).
3. Intervalo: 5 minutos; alerta e-mail se down.
4. Salvar screenshot do dashboard nesta pasta: `monitor-config.png`.

## Evidência local (desenvolvimento)

Health checks coletados em [NF-04-health](../NF-04-health/).
