# Arquitetura — Hexagonal, DDD e alinhamento ao relatório

Referência: identificação do projeto e diagrama de componentes (hexagonal) no DEM; restrições de tecnologia e integrações no DDE/ERS.

---

## 1. Princípios arquiteturais

- **Hexagonal (Ports & Adapters):** o domínio não depende de framework, ORM, fila ou HTTP. Adaptadores implementam portas (interfaces) definidas pelo núcleo.
- **DDD tático:** entidades, agregados, value objects onde fizer sentido, repositórios como abstração de persistência, domain services para regras que não pertencem a um único agregado, application services para orquestração de casos de uso.
- **Assincronismo nas bordas:** **NF-08** — IoT, notificações e integração externa não devem bloquear a thread de requisição do usuário quando o documento exige processamento assíncrono.
- **Segurança e observabilidade:** HTTPS, OAuth2/OIDC via Supabase (**NF-02**), logs estruturados (**NF-12**), health checks e circuit breaker (**NF-04**).

---

## 2. Segmentação lógica (camadas)

```
[ Drivers / Primary adapters ]
  HTTP REST (NestJS controllers), WebSocket gateway, consumidores RabbitMQ (IoT)
           |
[ Application layer ]  — casos de uso, DTOs de entrada/saída, transações
           |
[ Domain layer ]       — agregados Ativo, OrdemServico, políticas RN-*
           |
[ Ports ]              — interfaces: IAtivoRepository, IOrdemServicoRepository,
                         IEventPublisher, IAuditLog, IAirtableSync, IFileStorage, INotifier
           |
[ Secondary adapters ]
  Prisma/TypeORM → PostgreSQL (Supabase) — núcleo transacional,
  driver MongoDB — somente auditoria (coleção de logs conforme DEM),
  RabbitMQ producer/consumer, Airtable HTTP client, storage de objetos (upload 800MB),
  Supabase Auth
```

O frontend (Vercel) consome API REST e WebSocket; não contém regra de negócio além de validação de formulário e apresentação.

---

## 3. Módulos de deploy vs bounded contexts

| Módulo no relatório | Responsabilidade no runtime | Observação |
| ------------------- | ----------------------------- | ---------- |
| IAM | Autenticação OIDC, perfis, escopo por unidade | RBAC **RF-03**, **RF-16**; políticas **RN-03**, **RN-08** |
| Core Business | Ativos, OS, checklist, anexos, assinatura | Agregados do DEM |
| Mensageria / IoT | Ingestão de leituras, fila, criação OS preditiva, notificações | **RF-06**, **RN-01**, **RN-09** |
| Inteligência | Projeções para KPIs, gráficos Recharts, consultas otimizadas | **RF-08**, **RF-09**; respeitar **RN-03** |
| Interoperabilidade | Sincronização Airtable pós-conclusão | **RF-15**, **NF-08** |

Detalhe de contextos delimitados e anti-corruption layer: [03-CONTEXTO-DELIMITADO-E-BOUNDED-CONTEXTS.md](03-CONTEXTO-DELIMITADO-E-BOUNDED-CONTEXTS.md).

---

## 4. Stack tecnológica (explícita ou fortemente indicada)

| Camada | Tecnologia | Origem no documento |
| ------ | ---------- | ------------------- |
| Linguagem | TypeScript | Restrição 1.8.2 |
| Backend | NestJS (citado em riscos) | Mitigação riscos |
| Frontend | SPA/SSR compatível com Vercel + Recharts | DDE entregáveis / funcionalidades |
| Auth | Supabase (OAuth2/OIDC) | DDE homologação, NF-02 |
| Dados transacionais | **PostgreSQL** via Supabase | DEM relacional: unidades, usuários, ativos, OS, extensões |
| Auditoria (**RN-04**, **NF-05**, **RF-14**) | **MongoDB** | Critério ERS de verificação em Mongo; **não** duplicar trilha completa em SQL |
| Fila | RabbitMQ | DDE / NF-08 |
| ERP externo | Airtable API REST | DDE, RF-15 |
| Conteinerização / CI | Docker, GitHub Actions | DDE, riscos |
| IoT | Arduino ou ESP32 + DHT22 | Escopo |

---

## 5. Fluxos críticos (alto nível)

1. **Criação automática de OS (IoT):** dispositivo ou simulação → API ou broker → mensagem na fila → consumer valida **RN-01** (três leituras consecutivas acima do limite) → comando de domínio `CriarOrdemServicoPreditiva` → persistência → evento para notificação **RN-09** → WebSocket para UI **RF-18**.
2. **Fechamento de OS:** comando `FecharOrdemServico` valida **RN-02**, **RN-13**, **RN-07** (se peças modeladas), **RN-15** → atualiza estado do ativo **RN-14** → auditoria **RN-04** → publica evento para Airtable **RF-15**.

---

## 6. Resiliência e qualidade

- **Health checks** em API, worker de fila, **PostgreSQL**, **MongoDB** e RabbitMQ.
- **Circuit breaker** em chamadas ao Airtable e, se aplicável, ao Supabase Management.
- **Testes:** unitários no domínio; integração em adapters (DB, fila, HTTP externo); meta **80%** nas regras críticas (aceitação DDE).
- **Performance:** páginas críticas **NF-01** (< 2 s); uploads grandes via fila e storage externo (**NF-09**).

---

## 7. Documentação complementar (bordas do sistema)

- Contratos HTTP/WS, IoT e Airtable: [07-API-REST-E-CONTRATOS.md](07-API-REST-E-CONTRATOS.md)  
- Testes, segurança e evidências dos NF: [08-ESTRATEGIA-DE-TESTES-SEGURANCA-E-NF.md](08-ESTRATEGIA-DE-TESTES-SEGURANCA-E-NF.md)  
- Deploy, health, logs, backup: [09-INFRAESTRUTURA-OBSERVABILIDADE-E-BACKUP.md](09-INFRAESTRUTURA-OBSERVABILIDADE-E-BACKUP.md)  
- UI por perfil e checklist DEI: [06-DEI-NAVEGACAO-E-PERFIS.md](06-DEI-NAVEGACAO-E-PERFIS.md)

---

## 8. Atualização deste documento

**Decisão 2026-04-03:** persistência **dual** obrigatória — PostgreSQL para negócio, MongoDB para auditoria (ver [00-PLANO-MAESTRO.md](00-PLANO-MAESTRO.md) §5). Demais decisões (ex.: Prisma vs TypeORM) registrar aqui com data.
