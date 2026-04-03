# ManuCMMS — Backend

API em **NestJS** + **TypeScript**, organização alinhada à **arquitetura hexagonal**:

```
src/
├── domain/           # Entidades, value objects, portas (interfaces) — sem dependência de framework
│   └── ports/        # Contratos outbound (ex.: repositórios, audit log)
├── application/      # Casos de uso, orquestração, serviços de aplicação
├── infrastructure/   # Implementações: Prisma/TypeORM, MongoDB, RabbitMQ, clientes HTTP
├── presentation/     # Adaptadores inbound (HTTP, futuramente WebSocket, consumers)
│   └── http/
├── app.module.ts
└── main.ts
```

Instruções de execução e clone estão no [README da raiz](../README.md).
