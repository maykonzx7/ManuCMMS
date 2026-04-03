# ManuCMMS — Backend

API em **NestJS** + **TypeScript**, organização alinhada à **arquitetura hexagonal**:

```
src/
├── domain/           # Entidades, value objects, portas (interfaces) — sem dependência de framework
│   └── ports/        # Contratos outbound (ex.: repositórios, audit log)
├── application/      # Casos de uso, orquestração, serviços de aplicação
├── infrastructure/   # Implementações: health checks, Prisma/TypeORM, MongoDB, RabbitMQ
│   └── health/       # Indicadores PostgreSQL, MongoDB, RabbitMQ (Terminus)
├── presentation/     # Adaptadores inbound (HTTP, futuramente WebSocket, consumers)
│   ├── auth/         # Supabase JWT (Passport), guard global, @Public()
│   └── http/         # AppController, HealthController, MeController
├── app.module.ts
└── main.ts
```

Instruções de execução, **Docker Compose** e clone estão no [README da raiz](../README.md).

Variáveis da API: copie [`.env.example`](.env.example) para `backend/.env` (valores alinhados ao `docker-compose.yml` da raiz).
