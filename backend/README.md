# ManuCMMS — Backend

API em **NestJS** + **TypeScript**, organização alinhada à **arquitetura hexagonal**:

```
prisma/               # Schema, migrações, seed (Unidade Matriz em dev)
src/
├── domain/           # Entidades, portas — sem dependência de framework
│   ├── entities/
│   └── ports/        # ex.: IUnidadeReadPort
├── application/      # Casos de uso (ex.: ListUnidadesUseCase)
├── infrastructure/   # Prisma, health checks, MongoDB, RabbitMQ
│   ├── persistence/  # PrismaService, PrismaUnidadeRepository
│   └── health/
├── presentation/     # Adaptadores inbound (HTTP, futuramente WebSocket, consumers)
│   ├── auth/         # Supabase JWT (Passport), guard global, @Public()
│   └── http/         # AppController, HealthController, MeController
├── app.module.ts
└── main.ts
```

Instruções de execução, **Docker Compose** e clone estão no [README da raiz](../README.md).

Variáveis da API: copie [`.env.example`](.env.example) para `backend/.env` (valores alinhados ao `docker-compose.yml` da raiz).

Variáveis críticas de segurança:
- `PLATFORM_ADMIN_KEY`: obrigatória para `POST /empresas` via header `x-platform-admin-key` (escopo admin global).
- `ALLOW_AUTH_SUB_LINK_BY_EMAIL`: por padrão `false`; quando `true`, permite auto-vincular `auth_sub` por email na primeira autenticação.
