# API REST, WebSocket e integrações (caracterização técnica)

Complementa o que o relatório cita em **APIs e Integrações** e **interoperabilidade**, sem substituir a especificação OpenAPI futura. Objetivo: contratos estáveis entre frontend, IoT, fila e Airtable.

---

## 1. Princípios

- **HTTPS** em todos os ambientes expostos (**NF-02**).
- **Autenticação:** token emitido pelo fluxo **OAuth2/OIDC** (Supabase); API valida JWT (assinatura, expiração, claims de `sub`, papel, `id_unidade`).
- **Autorização:** enforcement de **RN-03**, **RN-08** em *cada* endpoint de negócio (não apenas no frontend).
- **Idempotência** onde houver reprocessamento de fila (criação OS preditiva **RF-06**).
- **Integrações externas assíncronas** quando o documento exige (**NF-08**): Airtable e jobs pesados fora do request síncrono.

---

## 2. Agrupamento de recursos REST (domínio)

Recursos alinhados ao DEM; nomes em português ou inglês — **escolher um padrão** e registrar no plano maestro.

| Domínio | Recurso (exemplo) | Operações principais | RF |
| ------- | ------------------- | --------------------- | --- |
| IAM | `/unidades`, `/usuarios` | CRUD conforme perfil | RF-01, RF-16 |
| Ativos | `/ativos` | CRUD, histórico | RF-04, RF-17 |
| OS | `/ordens-servico` | CRUD, transições de status, fechamento | RF-05, RF-07, RF-20 |
| Mídia | `/ordens-servico/:id/anexos` ou upload direto a storage com URL assinada | Iniciar upload, status do job | RF-10 |
| Auditoria | `/auditoria` | Listagem filtrada, export | RF-14, RN-12 |
| IoT ingestão | `/telemetria/leituras` ou rota dedicada com API key por dispositivo | POST leitura | RF-06, RF-19 |
| Saúde | `/health`, `/ready` | GET | NF-04 |

**Paginação e filtros:** atender **RF-12** e **RF-20** com query params documentados (data, status, técnico, ativo, unidade).

---

## 3. WebSocket (tempo real)

Eventos explícitos no ERS:

| Evento / canal | Conteúdo mínimo | RF |
| -------------- | ----------------- | --- |
| Temperatura por ativo | `ativoId`, valor, timestamp | RF-09 |
| Mudança de status de OS | `osId`, status anterior/novo | RF-18 |
| Notificação de alerta | tipo, mensagem, link | RF-11 |

**Segurança:** mesma identidade do JWT; assinar conexão ou usar ticket de curta duração trocado via REST.

---

## 4. Contrato de mensagem — fila (RabbitMQ)

Publicação após ingestão IoT ou simulação; consumer aplica **RN-01**.

Campos mínimos sugeridos (versionar payload, ex.: `v1`):

- `correlationId`, `ativoId`, `temperatura`, `lidoEm`, `origem` (dispositivo | simulacao).

**Garantias:** tratamento de duplicata; dead-letter em falha persistente; métricas **NF-08**.

---

## 5. Integração Airtable (**RF-15**)

- **Disparo:** após OS concluída (e dados de custo/peças quando existirem).
- **Transporte:** HTTP REST do Airtable; **circuit breaker** + retentativas com backoff (**NF-04**).
- **Fallback:** modo manual documentado no DDE (limite de API) — fila de “pendências de sincronização” administrável.
- **ACL:** módulo isolado; DTOs específicos do Airtable sem vazar para o domínio ([03](03-CONTEXTO-DELIMITADO-E-BOUNDED-CONTEXTS.md)).

---

## 6. OpenAPI / documentação

- Gerar **OpenAPI 3** a partir do NestJS ou manter arquivo canônico em `docs/openapi.yaml`.
- Publicar versão estável para o frontend e para avaliação acadêmica (**DDE** documentação técnica).

---

## 7. Atualização

Qualquer novo endpoint ou evento WebSocket: adicionar linha nas tabelas acima + bump de versão de contrato em [03-CONTEXTO-DELIMITADO-E-BOUNDED-CONTEXTS.md](03-CONTEXTO-DELIMITADO-E-BOUNDED-CONTEXTS.md).
