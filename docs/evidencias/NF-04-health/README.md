# NF-04 — Health check e resiliência de infraestrutura

**Data:** 26/05/2026  
**Endpoint:** `GET /health` (público)

## Cenário 1 — Todos os serviços UP

Arquivo: [health-all-up.json](health-all-up.json)

```json
{
  "status": "ok",
  "info": {
    "postgres": { "status": "up" },
    "mongodb": { "status": "up" },
    "rabbitmq": { "status": "up" },
    "redis": { "status": "up" }
  }
}
```

## Cenário 2 — RabbitMQ indisponível

Procedimento:

```bash
docker stop manucmms-rabbitmq
curl -s http://localhost:3000/health | jq .
docker start manucmms-rabbitmq
```

Arquivo: [health-rabbit-down.json](health-rabbit-down.json)

Resultado observado:

| Serviço | Status |
|---------|--------|
| Postgres | up |
| MongoDB | up |
| Redis | up |
| RabbitMQ | **down** |
| HTTP geral | **503/error** (Terminus reporta `status: error`) |

A API **continua respondendo** (não caiu o processo NestJS), degradando o health check — comportamento esperado para NF-04.

## Cenário 3 — Recuperação

Arquivo: [health-recovered.json](health-recovered.json) — `status: ok` após `docker start manucmms-rabbitmq`.

## Observação sobre `/integracoes/status`

Esse endpoint exige JWT (`401` sem token). A verificação operacional de integrações autenticadas deve ser feita via UI `/workspace/integracoes` ou com token de teste.

## Conclusão

**Atendido** — health checks expõem falha de dependência; recuperação validada após restart do container.
