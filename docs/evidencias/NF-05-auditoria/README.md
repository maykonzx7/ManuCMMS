# NF-05 — Evidência de auditoria (quem / quando / valor anterior)

**Data:** 26/05/2026  
**Ambiente:** Docker local (`manucmms-mongo`)  
**Coleção:** `log_auditoria` (MongoDB — trilha imutável complementar ao Postgres operacional)

## Critério ERS

Consulta de log deve expor **entidade**, **usuário** (quando aplicável), **valor anterior** e **valor novo**, com timestamp.

## Comando de verificação

```bash
docker exec manucmms-mongo mongosh \
  "mongodb://manucmms:manucmms_dev@127.0.0.1:27017/manucmms?authSource=admin" \
  --quiet --eval '
    db.log_auditoria.find({}, {
      entidade_afetada: 1,
      id_usuario: 1,
      valor_anterior: 1,
      valor_novo: 1,
      created_at: 1
    }).sort({ created_at: -1 }).limit(5).pretty()
  '
```

## Amostra coletada

Arquivo: [amostra-log-auditoria.json](amostra-log-auditoria.json)

Campos observados:

| Campo | Presente | Exemplo |
|-------|----------|---------|
| `entidade_afetada` | Sim | `Empresa` |
| `id_usuario` | Sim (nullable em onboarding) | `null` no bootstrap inicial |
| `valor_anterior` | Sim | `{}` em criação |
| `valor_novo` | Sim | JSON com dados da empresa/unidade/convite |
| `created_at` | Sim | ISO timestamp no documento Mongo |

## API complementar

A UI `/workspace/auditoria` consome `GET /auditoria` com filtros server-side e export CSV (`GET /auditoria/export`), alinhado à consulta exigida pelo DDE.

## Conclusão

**Atendido** para ambiente local — trilha dual Postgres (operacional) + Mongo (auditoria) com campos exigidos por RN-04/NF-05.
