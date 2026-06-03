# Deploy de homologação — ManuCMMS

Atualizado em: 02/06/2026

## Objetivo

Publicar uma versão **HTTPS** do ManuCMMS para demonstração acadêmica (DDE), com backend containerizado e frontend estático/SSR.

## Arquitetura recomendada

| Camada | Serviço sugerido | Observação |
|--------|------------------|------------|
| Frontend | Vercel | Next.js App Router; rewrites `/api` → backend |
| Backend API + WebSocket | **Render** (Web Service) | Docker (`backend/Dockerfile`); health `/health` |
| Postgres | Supabase | `prisma migrate deploy` no boot |
| MongoDB | Atlas M0 | Auditoria |
| RabbitMQ + Redis | CloudAMQP + Upstash (ou stack Docker única) | Homologação enxuta |

## Variáveis críticas

### Backend (`backend/.env.production`)

- `DATABASE_URL`
- `MONGODB_URI`
- `RABBITMQ_URL`
- `REDIS_URL`
- `SUPABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_ANON_KEY`
- `FRONTEND_PUBLIC_BASE_URL=https://<seu-dominio-frontend>`
- `CORS_ALLOWED_ORIGINS=https://<seu-dominio-frontend>`
- `CORS_ALLOWED_ORIGIN_SUFFIXES=.vercel.app` (opcional para previews)

### Frontend (Vercel)

Detalhamento completo: [15-VERCEL-FRONTEND-DEPLOY-KEYS.md](15-VERCEL-FRONTEND-DEPLOY-KEYS.md) · ficha: [VERCEL-FRONTEND-KEYS-PREENCHER.md](VERCEL-FRONTEND-KEYS-PREENCHER.md).

- `NEXT_PUBLIC_API_BASE_URL=https://<seu-dominio-api>`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Passo a passo — backend (Render)

1. [render.com](https://render.com) → **New → Web Service** → conectar o repositório GitHub.
2. **Root Directory:** `backend` ← **obrigatório** (monorepo; senão: `open Dockerfile: no such file or directory`).
3. **Environment:** Docker — Dockerfile em `backend/Dockerfile` (ou use o blueprint `render.yaml` na raiz).
4. **Health Check Path:** `/health`
5. Cadastrar variáveis de `backend/.env.production.example` em *Environment* (Supabase, MongoDB Atlas, CloudAMQP, Upstash, CORS, etc.).
6. Definir `PUBLIC_BASE_URL=https://<servico>.onrender.com` após o primeiro deploy.
7. Deploy → validar `GET https://<servico>.onrender.com/health`

### Erro comum: `failed to read dockerfile: open Dockerfile: no such file or directory`

O Render builda na **raiz do repo** por padrão. O repositório inclui um **`Dockerfile` na raiz** que monta a API a partir de `backend/` — faça **push** desse arquivo e redeploy.

**Se ainda falhar no painel:**

| Campo | Valor |
|-------|--------|
| Root Directory | *(vazio ou `.`)* |
| Dockerfile Path | `Dockerfile` |
| Docker Context | `.` |

**Alternativa:** Root Directory = `backend` e Dockerfile = `Dockerfile` (usa `backend/Dockerfile` direto).

### Erro: `P1001` em `db.*.supabase.co:5432` (Render / cloud)

A `DATABASE_URL` aponta para o Supabase, mas a **conexão direta** (`db.xxx.supabase.co:5432`) costuma falhar em provedores como Render (IPv6/rede).

**Correção** — Supabase → *Project Settings* → *Database* → **Connection string** → aba **Connection pooling** → mode **Session** (porta **5432**):

```text
postgresql://postgres.gjyhuthlfqvqdvqisdba:[SENHA]@aws-0-XX-XXXX.pooler.supabase.com:5432/postgres?sslmode=require
```

Diferenças em relação à URI direta:

| Item | Direta (falha no Render) | Pooler Session (usar) |
|------|--------------------------|------------------------|
| Host | `db.xxx.supabase.co` | `aws-0-....pooler.supabase.com` |
| Usuário | `postgres` | `postgres.gjyhuthlfqvqdvqisdba` |
| Porta | 5432 | 5432 |

Também confira no Supabase se o projeto **não está pausado** (free tier inativo).

Para `prisma migrate deploy` no boot, prefira **Session** (5432). Evite Transaction (6543) no entrypoint.

### Erro: `P1001: Can't reach database server at localhost:5432`

A **`DATABASE_URL` no Render está com valor de dev local** (ex.: copiada do `backend/.env.example`). No cloud não existe Postgres em `localhost`.

**Correção** — Supabase → *Project Settings* → *Database* → *Connection string* → **URI**:

```text
postgresql://postgres.[ref]:[SENHA]@....pooler.supabase.com:6543/postgres?sslmode=require
```

No Render → *Environment*: **substitua** `DATABASE_URL` pela URI do Supabase (senha = *Database password*).

**Alternativa** (remova `DATABASE_URL` e use):

| Variável | Valor |
|----------|--------|
| `SUPABASE_DB_HOST` | `db.SEU_PROJECT_REF.supabase.co` |
| `SUPABASE_DB_PASSWORD` | senha Postgres do Supabase |

Também configure serviços cloud (não `localhost`): `MONGODB_URI`, `RABBITMQ_URL`, `REDIS_URL`.

WebSocket: `wss://<servico>.onrender.com/realtime` (Socket.IO)

**Stack Docker local** (evidências / testes antes do cloud):

```bash
cd backend && cp .env.production.example .env.production
cd .. && docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

## Passo a passo — frontend (Vercel)

Ver [15-VERCEL-FRONTEND-DEPLOY-KEYS.md](15-VERCEL-FRONTEND-DEPLOY-KEYS.md).

1. Importar repositório — **Root Directory:** `frontend/`.
2. Cadastrar as 3 variáveis `NEXT_PUBLIC_*` (Production + Preview).
3. Supabase Auth: Site URL + Redirect URLs (`/workspace/acesso/redefinir-senha`, previews `.vercel.app`).
4. Atualizar `FRONTEND_PUBLIC_BASE_URL` e CORS no backend.
5. Deploy → validar login, OS, integrações e notificações em tempo real.

## URLs de homologação

Registrar em [HOMOLOG-URL.md](HOMOLOG-URL.md) após o deploy.

Validação rápida:

```bash
export API_BASE_URL=https://SUA-API
export FRONTEND_BASE_URL=https://SEU-FRONT
./scripts/homolog/check-homolog.sh
```

## Evidências NF (checklist)

- [ ] **NF-01** Tempo de resposta HTTP — `./scripts/collect-nf-evidence.sh` → `NF-01-performance/resumo-tempo-resposta.json`
- [ ] **NF-11** axe DevTools — [NF-11-a11y/README.md](evidencias/NF-11-a11y/README.md)
- [ ] **NF-03** Screenshots — `docs/evidencias/NF-03-screenshots/` + `capture-nf03-screenshots.sh`
- [ ] **NF-08** Screenshot UI — [NF-08-circuit-breaker/PROCEDIMENTO-UI.md](evidencias/NF-08-circuit-breaker/PROCEDIMENTO-UI.md)
- [ ] **NF-10** Backup — incluído em `collect-nf-evidence.sh` (Postgres + Mongo local)

## Testes antes do go-live

```bash
cd backend
RUN_DB_E2E=1 npm run test:e2e
npm test
npm run build

cd ../frontend
npm run build
```

## Rollback

- Backend: redeploy da imagem anterior no provedor.
- Frontend: rollback de deployment na Vercel.
- Banco: restaurar snapshot pré-migration se necessário.
