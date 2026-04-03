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

### Supabase Auth (**NF-02**)

Configure `SUPABASE_URL` e `SUPABASE_JWT_SECRET` em `backend/.env` (valores no **Dashboard do projeto** → *Settings* → *API*). O frontend obtém o access token com o client Supabase; a API valida o **Bearer JWT** (HS256, issuer `/auth/v1`, audience `authenticated`). Rota de exemplo protegida: `GET /me`.

### Health check (**NF-04**)

Com Docker no ar e `backend/.env` configurado:

```bash
curl -s http://localhost:3000/health
```

Resposta **200** com `status: "ok"` e `postgres`, `mongodb`, `rabbitmq` em `up` quando os três serviços respondem. **503** se algum falhar ou variável de conexão estiver ausente.

Validar só os containers:

```bash
docker compose ps
# Esperado: (healthy) em cada serviço
```

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

## CI (GitHub Actions)

No **push** ou **pull request** para `main`, o workflow [`.github/workflows/ci-backend.yml`](.github/workflows/ci-backend.yml) executa no backend: `npm ci`, **lint**, **build**, **testes unitários** e **e2e** (não exige Docker no runner).

## Próximos passos

- Fase 1: IAM (Supabase), modelo de unidade fabril e RBAC — ver [docs/00-PLANO-MAESTRO.md](docs/00-PLANO-MAESTRO.md) e [docs/05-CRONOGRAMA-E-FASES.md](docs/05-CRONOGRAMA-E-FASES.md).
