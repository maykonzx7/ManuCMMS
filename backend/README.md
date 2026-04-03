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
