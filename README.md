# ManuCMMS

Sistema corporativo de gestão de manutenção de ativos (CMMS), com IoT.

- **Repositório remoto:** [github.com/maykonzx7/ManuCMMS](https://github.com/maykonzx7/ManuCMMS)

## Estrutura do repositório

| Pasta | Conteúdo |
| ----- | --------- |
| `backend/` | API **NestJS** + TypeScript, arquitetura **hexagonal** (em evolução). |
| `docs/` | Plano maestro, arquitetura DDD, contratos API, NF/RF/RN. |

## Pré-requisitos

- Node.js **20+** (LTS recomendado)
- npm
- **Docker** e **Docker Compose** v2 (para PostgreSQL, MongoDB e RabbitMQ locais)

## Infraestrutura local (Docker Compose) — fase 0.2

Na **raiz** do repositório:

```bash
# (opcional) copiar variáveis do Compose
cp .env.example .env

docker compose up -d
docker compose ps
```

| Serviço    | Porta host | Uso |
| ---------- | ---------- | --- |
| PostgreSQL | 5432       | Dados transacionais (paridade dev com Supabase) |
| MongoDB    | 27017      | Auditoria (**RN-04**, **NF-05**) |
| RabbitMQ AMQP | 5672   | Filas (**NF-08**) |
| RabbitMQ Management UI | **15672** | http://localhost:15672 — usuário/senha padrão iguais ao `.env.example` |

Credenciais padrão (apenas desenvolvimento): usuário `manucmms`, senha `manucmms_dev`. Personalize em `.env` na raiz.

Parar e remover containers (mantém volumes): `docker compose down`.  
Remover volumes também: `docker compose down -v`.

## Como rodar a API (desenvolvimento)

Com os serviços Docker no ar:

```bash
cp backend/.env.example backend/.env
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

- `GET /health` com checagem de PostgreSQL, MongoDB e RabbitMQ.
- CI com GitHub Actions.

Ver [docs/00-PLANO-MAESTRO.md](docs/00-PLANO-MAESTRO.md) e [docs/05-CRONOGRAMA-E-FASES.md](docs/05-CRONOGRAMA-E-FASES.md).
