# ManuCMMS

Sistema corporativo de gestão de manutenção de ativos (CMMS), com IoT, conforme especificação em `V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA.md`.

- **Documentação de engenharia:** [CONTEXT.MD](CONTEXT.MD) e pasta [docs/](docs/).
- **Repositório remoto:** [github.com/maykonzx7/ManuCMMS](https://github.com/maykonzx7/ManuCMMS)

## Estrutura do repositório

| Pasta | Conteúdo |
| ----- | --------- |
| `backend/` | API **NestJS** + TypeScript, arquitetura **hexagonal** (em evolução). |
| `docs/` | Plano maestro, arquitetura DDD, contratos API, NF/RF/RN. |

## Pré-requisitos

- Node.js **20+** (LTS recomendado)
- npm

## Como rodar a API (desenvolvimento)

```bash
cd backend
npm install
npm run start:dev
```

Por padrão a API escuta na porta **3000** (ou a variável `PORT`). Raiz HTTP: `GET /` retorna mensagem de status do projeto.

Outros scripts úteis: `npm run build`, `npm run test`, `npm run test:e2e`, `npm run lint`.

## Git — primeiro push (repositório vazio no GitHub)

```bash
git init
git remote add origin https://github.com/maykonzx7/ManuCMMS.git
git add .
git commit -m "chore: estrutura inicial do repositório e backend Nest (fase 0.1)"
git branch -M main
git push -u origin main
```

Se o remoto já existir com histórico, use `git remote set-url origin ...` em vez de `add`.

## Próximos passos (fase 0)

- Docker Compose (PostgreSQL, MongoDB, RabbitMQ).
- `GET /health` com checagem dos serviços.
- CI com GitHub Actions.

Ver [docs/00-PLANO-MAESTRO.md](docs/00-PLANO-MAESTRO.md) e [docs/05-CRONOGRAMA-E-FASES.md](docs/05-CRONOGRAMA-E-FASES.md).
