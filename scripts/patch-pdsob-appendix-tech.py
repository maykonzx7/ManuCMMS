#!/usr/bin/env python3
"""Atualiza seção 5.2 (tecnologias) e apêndices H–K no relatório PDSOB."""
from __future__ import annotations

from pathlib import Path

REPORT = Path(__file__).resolve().parents[1] / "Cópia de V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA(1).md"

TECH_SECTION = """**5.2 TECNOLOGIAS UTILIZADAS** {#5.2-tecnologias-utilizadas}

**5.2.1 Frontend** {#5.2.1-frontend}

| Tecnologia | Versão | Finalidade |
| :---- | :---- | :---- |
| Next.js | 16.2 | Framework web (App Router) |
| React | 19 | Interface de usuário |
| TypeScript | 5.7 | Tipagem estática |
| Tailwind CSS | 4.2 | Estilização utilitária |
| Radix UI | 1.x | Componentes acessíveis |
| React Hook Form + Zod | 7.x / 3.x | Formulários e validação |
| Recharts | 2.15 | Gráficos do dashboard |
| Leaflet / React-Leaflet | 1.9 / 5.0 | Mapa de ativos |
| Serwist | 9.5 | PWA e cache offline |
| Socket.io client | 4.8 | Notificações em tempo real |
| Supabase JS | 2.57 | Autenticação no cliente |

**5.2.2 Backend** {#5.2.2-backend}

| Tecnologia | Versão | Finalidade |
| :---- | :---- | :---- |
| NestJS | 11 | API REST e WebSocket |
| Node.js / TypeScript | 20+ / 5.7 | Runtime e linguagem |
| Prisma ORM | 5.22 | Mapeamento PostgreSQL |
| Passport JWT | 4.x | Autenticação de API |
| Socket.io | 4.8 | Gateway /realtime |
| class-validator | — | Validação de DTOs |
| amqplib | 1.0 | Publicação RabbitMQ |
| MongoDB Driver | 7.1 | Trilha de auditoria |
| Redis | 4.7 | Contadores IoT e cache |
| Nodemailer / Brevo | 8.x | E-mail transacional |

Arquitetura hexagonal: camadas domain, application, infrastructure e presentation.

**5.2.3 Microserviços** {#5.2.3-microserviços}

| Serviço | Porta | Responsabilidade |
| :---- | :---- | :---- |
| manucmms-api (backend) | 3000 | API principal, IAM, OS, ativos, integrações |
| iot-ingestion | 3002 | POST /iot/leituras e /iot/simular |
| worker-events | 3005 | Consumo RabbitMQ, OS preditiva (RN-01), webhooks |

**5.2.4 Banco de Dados e Mensageria** {#5.2.4-banco-de-dados}

| Componente | Provedor / versão | Uso |
| :---- | :---- | :---- |
| PostgreSQL | 16 (Supabase) | Dados transacionais (Prisma) |
| MongoDB | 7 (Atlas M0) | Coleção log_auditoria |
| RabbitMQ | 3.13 (CloudAMQP) | Exchange manucmms.events |
| Redis | 7 (Upstash) | Leituras IoT e contadores RN-01 |
| Supabase Auth | — | Login, convites, JWT |
| Supabase Storage | — | Anexos e fotos de OS |

**5.2.5 Hardware e IoT** {#5.2.5-hardware-iot}

| Item | Especificação |
| :---- | :---- |
| Microcontrolador | ESP32 ou Arduino |
| Sensor | DHT22 (temperatura) |
| Plataforma nuvem | ThingSpeak ou Adafruit IO |
| Ingestão | Microserviço iot-ingestion → RabbitMQ → worker-events |

**5.2.6 Ferramentas de Apoio** {#5.2.6-ferramentas-de-apoio}

Docker Compose, GitHub Actions (CI), ESLint, Prettier, Jest, k6 (carga), OWASP ZAP (segurança), Playwright e axe (acessibilidade e evidências NF).

**5.2.7 Padrões Adotados** {#5.2.7-padrões-adotados}

Arquitetura hexagonal, DDD, RBAC multi-tenant por unidade fabril, API REST, eventos assíncronos, circuit breaker em integrações externas, auditoria append-only em MongoDB.

**5.2.8 Boas Práticas e Convenções** {#5.2.8-boas-práticas-e-convenções}

Variáveis de ambiente protegidas, validação de entrada em DTOs, escopo por unidade validado no servidor, migrations Prisma versionadas, testes automatizados das regras de negócio críticas.

**5.2.9 Requisitos de Infraestrutura** {#5.2.9-requisitos-de-infraestrutura}

| Camada | Provedor |
| :---- | :---- |
| Frontend | Vercel |
| API e microserviços | Render (3 Web Services) |
| PostgreSQL, Auth e Storage | Supabase |
| MongoDB | Atlas |
| RabbitMQ | CloudAMQP |
| Redis | Upstash |
| IoT (nuvem) | ThingSpeak ou Adafruit IO |
| E-mail | Brevo |

**5.2.10 APIs e Integrações** {#5.2.10-apis-e-integrações}

* GET /health — disponibilidade (NF-04)
* POST /auth/session, /auth/resolve-login — sessão HttpOnly
* CRUD /unidades/:id/ativos, /ordens-servico, /pecas
* GET /unidades/:id/dashboard/executivo — RF-08
* GET /api/v1/integracao/unidades/:id/... — API parceiro (x-api-key)
* WebSocket /realtime — RF-11, RF-18
* POST /iot/leituras, /iot/simular — telemetria IoT

**5.2.11 Caracterização da API** {#5.2.11-caracterização-da-api}

JSON, datas ISO-8601 UTC, autenticação via Bearer JWT ou cookie de sessão, códigos HTTP 400/401/403/404/409/503, idempotência na ingestão IoT.

"""

APPENDIX_H_K = """APÊNDICE H \\- PRISMA SCHEMA (TRECHO)

Trecho do arquivo backend/prisma/schema.prisma (26 migrations). Modelos centrais do domínio:

```prisma
enum StatusOrdemServico {
  ABERTA
  AGUARDANDO
  EM_EXECUCAO
  CONCLUIDA
  CANCELADA
}

model Empresa {
  id               String   @id @default(uuid())
  nomeEmpresa      String
  slug             String   @unique
  webhookUrl       String?
  apiKeyIntegracao String?  @unique
  unidades         UnidadeFabril[]
}

model Ativo {
  id         String      @id @default(uuid())
  idUnidade  String
  nome       String
  status     StatusAtivo @default(OPERACIONAL)
  limiteTemp Float       @default(48)
  ordensServico OrdemServico[]
}

model OrdemServico {
  id              String             @id @default(uuid())
  idAtivo         String
  tipo            TipoOrdemServico
  status          StatusOrdemServico @default(ABERTA)
  descricao       String
  fotoProblema    String?
  fotoSolucao     String?
  assinaturaDigital String?
  ativo           Ativo              @relation(fields: [idAtivo], references: [id])
}
```

Fonte: Produzido pelo autor.

APÊNDICE I \\- DOCKER COMPOSE (TRECHO)

Trecho do docker-compose.yml para ambiente de desenvolvimento e homologação local:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    ports: ["5672:5672", "15672:15672"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  worker-events:
    build: services/worker-events
    ports: ["3005:3005"]
    depends_on: [postgres, rabbitmq]
  iot-ingestion:
    build: services/iot-ingestion
    ports: ["3002:3002"]
    depends_on: [postgres, rabbitmq, redis]
```

Fonte: Produzido pelo autor.

APÊNDICE J \\- ESTRATÉGIA E COMANDOS DE TESTE

| Tipo | Ferramenta | Escopo |
| :---- | :---- | :---- |
| Unitário | Jest | Use cases e regras RN críticas |
| Integração | Supertest | Endpoints REST |
| Carga | k6 | NF-01 — desempenho |
| Segurança | OWASP ZAP | NF-02 — baseline |
| Acessibilidade | axe + Playwright | NF-11 |
| Disponibilidade | Health probe | NF-04, NF-07 |

Execução no repositório (ambiente de desenvolvimento):

```bash
docker compose up -d
cd backend && npm test && npm run test:critical
cd frontend && npm run build
```

Fonte: Produzido pelo autor.

APÊNDICE K \\- EVIDÊNCIAS DOS TESTES NÃO FUNCIONAIS

| NF | Requisito | Evidência |
| :---- | :---- | :---- |
| NF-01 | Desempenho | Medições de tempo de resposta e teste de carga |
| NF-02 | Segurança | Varredura OWASP ZAP |
| NF-03 | Responsividade | Capturas em 360px, 768px e 1280px |
| NF-04 | Disponibilidade | Health checks da API e microserviços |
| NF-05 | Auditoria | Trilha MongoDB e exportação CSV |
| NF-06 | Backup | Procedimento documentado |
| NF-07 | Uptime | Sondagem periódica do endpoint /health |
| NF-08 | Integração | Circuit breaker e fila de retentativas |
| NF-09 | Usabilidade | Testes de fluxo por perfil |
| NF-10 | Compatibilidade | Navegadores Chrome, Edge e Firefox |
| NF-11 | Acessibilidade | Relatório axe nas telas principais |

Fonte: Produzido pelo autor.

"""


def patch_report() -> None:
    text = REPORT.read_text(encoding="utf-8")
    idx_img = text.find("\n[image1]:")
    body, tail = (text[:idx_img], text[idx_img:]) if idx_img != -1 else (text, "")

    # 5.2 → 5.3
    start_tech = body.find("**5.2 TECNOLOGIAS UTILIZADAS**")
    end_tech = body.find("**5.3 REPOSITÓRIO E CÓDIGO-FONTE**")
    if start_tech == -1 or end_tech == -1:
        raise SystemExit("Seção 5.2 não encontrada")
    body = body[:start_tech] + TECH_SECTION + body[end_tech:]

    # Apêndice H → L (preserva L)
    start_h = body.find("APÊNDICE H \\- PRISMA SCHEMA")
    start_l = body.find("APÊNDICE L \\- DIAGRAMAS")
    if start_h == -1 or start_l == -1:
        raise SystemExit("Apêndices H ou L não encontrados")
    body = body[:start_h] + APPENDIX_H_K + body[start_l:]

    # Terceiro diagrama de sequência (fechamento OS) no Apêndice B
    marker = "Worker -> API : criar OS preditiva\n@enduml\n\nAPÊNDICE C"
    if marker in body and "fechar OS" not in body[body.find("APÊNDICE B"):body.find("APÊNDICE C")]:
        seq3 = """
@startuml
participant Tecnico
participant Frontend
participant API
participant Webhook
Tecnico -> Frontend : evidencias e assinatura
Frontend -> API : PATCH fechar OS
API --> Frontend : OS CONCLUIDA
API -> Webhook : evento outbound RF-15
@enduml

"""
        body = body.replace(
            "Worker -> API : criar OS preditiva\n@enduml\n\nAPÊNDICE C",
            "Worker -> API : criar OS preditiva\n@enduml\n" + seq3 + "APÊNDICE C",
        )

    REPORT.write_text(body + tail, encoding="utf-8")
    print(f"Atualizado: {REPORT}")


if __name__ == "__main__":
    patch_report()
