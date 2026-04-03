# Padrões de design — encaixe ao ManuCMMS

Seleção baseada nos requisitos explícitos (comunicação assíncrona, integrações, regras de negócio rígidas, IoT, UI em tempo real).

---

## 1. Padrões estruturais

| Padrão | Onde aplicar | Ligação ao documento |
| ------ | ------------- | ---------------------- |
| **Hexagonal (Ports & Adapters)** | Todo o backend | Projeto obrigatório |
| **Repository** | Persistência de Ativo, OS, Usuario (perfil), Unidade, Audit | DEM, DDD |
| **Anti-Corruption Layer** | Módulo Airtable (DTOs externos ≠ modelo de domínio) | RF-15 |
| **Facade** | Application service expondo casos de uso complexos (ex.: fechar OS + atualizar ativo + disparar sync) | RN-02, RN-14 |

---

## 2. Padrões comportamentais

| Padrão | Onde aplicar | Ligação ao documento |
| ------ | ------------- | ---------------------- |
| **Domain Events (internos)** | Após `OrdemServicoConcluida`, `TemperaturaCriticaDetectada` | NF-08, RF-15, RN-09 |
| **Strategy** | Canais de notificação (WebSocket, fila para push futuro) | RF-11 |
| **State** (explícito no domínio) | Máquina de estados da OS alinhada ao diagrama de estados do DEM | RF-07, RN-15 |
| **Template Method / Pipeline** | Processamento de upload: validar → armazenar → associar à OS | RF-10, NF-09 |
| **Specification** | Filtros combinados avançados | RF-12, RF-20 |
| **Factory** | Criação de OS **Preditiva** (IoT) vs **Manual** vs **Preventiva** agendada | RF-05, RF-06 |

---

## 3. Padrões de integração e infraestrutura

| Padrão | Onde aplicar | Ligação ao documento |
| ------ | ------------- | ---------------------- |
| **Message Queue (Publisher–Consumer)** | RabbitMQ para eventos de temperatura e jobs pesados | DDE, NF-08 |
| **Circuit Breaker** | Cliente HTTP Airtable (e outros externos) | NF-04 |
| **Outbox / Idempotência** (recomendado) | Garantir que OS preditiva não duplique sob reentrega de mensagem | RF-06, RN-01 |
| **Saga (coreografada simples)** | Fluxo: concluir OS → auditoria → tentativa Airtable → compensação logada se falhar | RF-15 |

---

## 4. CQRS “leve” (opcional mas alinhado)

- **Escrita:** agregados Ativo e OrdemServico via repositórios transacionais.
- **Leitura:** projeções ou queries otimizadas para dashboard (MTBF, MTTR, OEE, percentuais, custo mensal) sem poluir o modelo de escrita.

Útil para **RF-08** e performance **NF-01**, mantendo DDD no núcleo de comandos.

---

## 5. O que evitar neste projeto

- **Active Record** como modelo dominante (conflita com hexagonal e testes de domínio).
- **Lógica de negócio no frontend** além de validações de UX.
- **Chamadas síncronas bloqueantes** a ERP ou IoT no request principal (**NF-08**).

---

## 6. Atualização

Ao introduzir novo padrão (ex.: Event Sourcing), justificar aqui e vincular a RF/NF afetados.
