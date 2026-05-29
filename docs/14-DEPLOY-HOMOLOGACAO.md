# Deploy de homologação — ManuCMMS

Atualizado em: 26/05/2026

## Objetivo

Publicar uma versão **HTTPS** do ManuCMMS para demonstração acadêmica (DDE), com backend containerizado e frontend estático/SSR.

## Arquitetura recomendada

| Camada | Serviço sugerido | Observação |
|--------|------------------|------------|
| Frontend | Vercel | Next.js App Router; rewrites `/api` → backend |
| Backend API + WebSocket | Railway / Render / Fly.io | Docker (`backend/Dockerfile`) |
| Postgres | Supabase ou Railway Postgres | `prisma migrate deploy` no boot |
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

### Frontend

- `NEXT_PUBLIC_API_BASE_URL=https://<seu-dominio-api>`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Passo a passo — backend (Docker)

```bash
cd backend
cp .env.production.example .env.production
# editar credenciais reais

cd ..
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

Healthcheck: `GET https://<api>/health`

WebSocket: namespace `wss://<api>/realtime` (Socket.IO)

## Passo a passo — frontend (Vercel)

1. Importar repositório (`frontend/` como root ou monorepo com root dir).
2. Definir `NEXT_PUBLIC_API_BASE_URL` apontando para a API pública.
3. Configurar redirect Supabase: `/workspace/acesso/redefinir-senha`.
4. Deploy → validar login, OS, integrações e notificações em tempo real.

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
