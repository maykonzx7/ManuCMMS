# API REST, WebSocket, IoT e integrações — caracterização

Complementa o que o sumário do relatório agrupa em **5.2.8 APIs e Integrações** e **5.2.9 Caracterização da API**, explicitando contratos de borda para implementação. Convenções devem ser refletidas depois em OpenAPI/Swagger no repositório.

---

## 1. Princípios

- **REST** para CRUD e comandos síncronos de negócio com resposta previsível.
- **JSON** como formato de troca; datas em **ISO-8601** UTC.
- **Versionamento** recomendado: prefixo `/api/v1/`.
- **Autenticação:** Bearer JWT (ou sessão) emitido pelo fluxo **Supabase** / validação no backend (**NF-02**).
- **Autorização:** cada handler aplica escopo de **unidade** (**RN-08**) e **perfil** (**RN-03**, **RF-03**).
- **Idempotência** em operações sensíveis a duplicação (ex.: ingestão IoT que pode reenviar mensagens).

---

## 2. Recursos REST alinhados ao DEM (esboço)

| Domínio | Recurso | Operações previstas | RF |
| ------- | ------- | ------------------- | --- |
| Unidades | `/unidades` | GET (lista restrita), POST/PUT (Admin) | Implícito IAM |
| Usuários | `/usuarios` | CRUD + inativação | RF-01, RF-16 |
| Ativos | `/ativos` | CRUD + histórico aninhado | RF-04, RF-17 |
| OS | `/ordens-servico` | CRUD, transições de status, fechamento | RF-05, RF-07, RF-20 |
| Mídia | `/ordens-servico/:id/anexos` | Upload iniciado (URL assinada ou multipart chunked) | RF-10, NF-09 |
| Auditoria | `/auditoria` | GET com filtros; export (**dados em MongoDB**) | RF-14, RN-12 |
| KPIs | `/relatorios/kpis` ou `/dashboard/kpis` | GET agregado (**principalmente PostgreSQL**) | RF-08 |
| Simulação | `/iot/simular-leitura` | POST (apenas perfil autorizado) | RF-19 |

**Persistência:** transacional em **PostgreSQL**; trilha de auditoria apenas em **MongoDB** ([11-MODELO-DADOS-ESTENDIDO-E-BPMN.md](11-MODELO-DADOS-ESTENDIDO-E-BPMN.md) §3). Nomes finais em inglês ou português: **padronizar no primeiro PR** e registrar no plano maestro.

---

## 3. WebSocket (tempo real)

| Canal / evento | Conteúdo mínimo | RF |
| ---------------- | --------------- | --- |
| `temperatura:{ativoId}` | valor, timestamp, unidade | RF-09 |
| `os:status` | id OS, status anterior/novo, unidade | RF-18 |
| `notificacoes:{usuarioId}` | tipo, mensagem, ref OS/ativo | RF-11 |

Política: autenticar conexão WS com o mesmo token; filtrar eventos por **RN-08** e **RN-03**.

---

## 4. Ingestão IoT (até a fila)

Duas abordagens compatíveis com o documento:

1. **HTTP POST** autenticado (API key por dispositivo ou certificado leve) recebendo `{ ativoId, temperaturaC, lidoEm }` → publica em **RabbitMQ** (**NF-08**).
2. **Gateway** (futuro) lendo MQTT do ESP32 — fora do escopo mínimo se o hardware usar apenas REST.

O consumer aplica **RN-01** (três leituras consecutivas acima do limite do ativo) antes de criar OS.

---

## 5. Airtable (ERP)

- **Disparo:** assíncrono após `OrdemServico` concluída (**RF-15**).
- **Payload:** mapear campos mínimos: identificadores OS, custos, peças usadas (quando **RN-07** existir), unidade.
- **Resiliência:** circuit breaker, fila de retry, **fallback manual** (risco DDE limite de API).
- **ACL:** módulo isolado; domínio não depende de nomes de coluna Airtable.

---

## 6. Erros e códigos HTTP

- `400` validação de negócio (ex.: fechar OS sem foto — **RN-02**).
- `401` / `403` autenticação e autorização.
- `404` recurso fora do escopo de unidade (tratar como 404 para não vazar existência — decisão de segurança).
- `409` conflito de estado (ex.: OS já fechada — **RN-15**).
- `503` dependência indisponível (opcional com corpo indicando retry).

---

## 7. Próximos passos obrigatórios no código

- Publicar **OpenAPI 3** gerada ou mantida manualmente.
- Documentar **schema das mensagens** da fila (versão + migration de payload).

---

## 8. Atualização

Qualquer novo endpoint ou evento WS deve citar **RF/NF** neste arquivo antes do merge.
