# ManuCMMS

Sistema corporativo de gestão de manutenção de ativos (CMMS), com IoT.

- **Repositório remoto:** [github.com/maykonzx7/ManuCMMS](https://github.com/maykonzx7/ManuCMMS)

## Estrutura do repositório

| Pasta | Conteúdo |
| ----- | --------- |
| `backend/` | API **NestJS** + TypeScript, arquitetura **hexagonal** (em evolução). |

A documentação do TCC (CONTEXT, PDSOB, DEM, DEI, Manual, apêndice, `docs/`) **não é versionada**. Mantenha em `documentacao-local/` e configure paths com:

```bash
cp .env.documentacao.example .env.documentacao
# opcional: inclua no .env da raiz com source .env.documentacao
```

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
| Redis      | 6379       | Rate limit e operações de baixa latência |

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

Segurança adicional de onboarding e vínculo:
- `POST /empresas` exige header `x-platform-admin-key` com o valor de `PLATFORM_ADMIN_KEY` (admin global da plataforma).
- `ADMIN` de empresa cliente nao possui esse privilegio global.
- `ALLOW_AUTH_SUB_LINK_BY_EMAIL` controla auto-vinculo por email na primeira autenticacao. O recomendado e `false` para manter acesso apenas por convite.

### Health check (**NF-04**)

Com Docker no ar e `backend/.env` configurado:

```bash
curl -s http://localhost:3000/health
```

Resposta **200** com `status: "ok"` e `postgres`, `mongodb`, `rabbitmq`, `redis` em `up` quando os serviços respondem. **503** se algum falhar ou variável de conexão estiver ausente.

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

## Banco de dados (Prisma)

Na pasta `backend/`:

```bash
# com Docker Compose (Postgres) no ar
cd backend
npx prisma migrate deploy
npx prisma db seed   # cria unidade "Matriz" se a tabela estiver vazia
```

Scripts: `npm run prisma:migrate`, `npm run prisma:deploy`, `npm run prisma:seed`. O **build** da API inclui `prisma generate`.

Teste e2e com lista de unidades (integração): `RUN_DB_E2E=1 npm run test:e2e` no `backend/` com Postgres migrado e seed.

## CI (GitHub Actions)

No **push** ou **pull request** para `main`, o workflow [`.github/workflows/ci-backend.yml`](.github/workflows/ci-backend.yml) sobe **Postgres, Mongo e RabbitMQ** como serviços, executa **Prisma migrate deploy** e **seed**, depois **lint**, **build** e **testes** (inclui e2e com `/unidades`).

## Produção / homologação (DDE)

Stack Docker de produção local + deploy cloud (Render + Vercel):

```bash
chmod +x scripts/prod/*.sh
./scripts/prod/setup-env.sh
# Edite backend/.env.production (Supabase, CORS, FRONTEND_PUBLIC_BASE_URL)
./scripts/prod/up.sh
./scripts/prod/verify.sh
```

Coleta de evidências NF e checklist da defesa:

```bash
cd frontend && npm run build && npm run start -p 3001 &
./scripts/prod/collect-nf-dde.sh
```

Documentação de deploy e defesa: arquivos em `documentacao-local/docs/` (local).

## Render — microserviços IoT (RN-01)

Produção usa três serviços web no Render (ver [`render.yaml`](render.yaml)):

| Serviço | Função |
| ------- | ------ |
| `manucmms` ou `manucmms-api` | API NestJS |
| `manucmms-iot-ingestion` | Ingestão IoT e simulação |
| `manucmms-worker-events` | OS preditiva + filas RabbitMQ |

### CLI e provisionamento

```bash
chmod +x scripts/render/*.sh
./scripts/render/install-cli.sh

# Autenticação (obrigatória para provisionamento):
export RENDER_API_KEY=rnd_...   # Dashboard → Account Settings → API Keys
# Para logs/deploy manual no CLI: render login

cp .env.render.example .env.render   # opcional
./scripts/render/provision-microservices.sh
./scripts/render/check-iot-stack.sh
```

O script de provisionamento cria os microserviços faltantes, vincula env groups (se existirem), define `IOT_INGESTION_URL` na API e dispara deploy.

Alternativa manual: Render Dashboard → **Blueprints** → New Blueprint Instance → repositório GitHub → `render.yaml`.

## Próximos passos

- Fase 1: IAM (Supabase), modelo de unidade fabril e RBAC — ver plano maestro e cronograma na pasta local `documentacao-local/docs/`.
