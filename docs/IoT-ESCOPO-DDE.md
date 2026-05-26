# IoT e OS preditiva — decisão de escopo (DDE)

**Data:** 26/05/2026  
**Prazo DDE:** 02/07/2026

## Decisão

O fluxo IoT completo (**RN-01**, **RF-06**, **RF-09**, **RF-19**) permanece **adiado** neste ciclo. A defesa apresenta **interoperabilidade substituta** já implementada:

| Requisito original | Entrega atual |
|--------------------|---------------|
| Airtable / envio automático | API parceiro (`x-api-key`) + webhook outbound pós-fechamento |
| Dashboard tempo real | WebSocket `/realtime` (RF-11, RF-18) |
| Health IoT | `GET /integracoes/status` + `IOT_HEALTHCHECK_URL` |
| OS preditiva por temperatura | Documentada como evolução Fase 5; simulação manual via criação de OS corretiva |

## Risco no checklist 1.9

Itens “IoT/simulação → OS preditiva” e “Airtable” devem ser explicados na apresentação como **substituição arquitetural** (ver [STATUS-MODULOS-OBRIGATORIOS.md](STATUS-MODULOS-OBRIGATORIOS.md)).

## Evolução mínima (opcional pós-DDE)

1. Endpoint `POST /iot/leituras` com validação RN-01 (3 leituras consecutivas).
2. Consumer RabbitMQ criando OS corretiva.
3. Gráfico Recharts na home gestor (RF-09).
