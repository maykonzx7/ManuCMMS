# Estratégia de testes, segurança e verificação dos NF

Consolida os **critérios de medição** explícitos no ERS que ainda não tinham um plano único de execução.

---

## 1. Pirâmide de testes e meta de cobertura

| Nível | Escopo | Objetivo no ManuCMMS |
| ----- | ------ | --------------------- |
| Unitário | Entidades, domain services, value objects | Invariantes **RN-*** sem I/O. |
| Integração | Repositórios, consumer RabbitMQ, cliente Airtable (mock ou sandbox) | **RF-06**, **RF-15**, **NF-08**. |
| E2E (poucos) | Fluxos críticos: login, criar OS, fechar com anexo, IoT→OS | Critérios DDE 1.9. |
| Contrato | Schema API / mensagens fila | Evolução sem quebrar clientes. |

**DDE / aceitação:** cobertura mínima **80%** nas **regras de negócio críticas** (interpretação: domínio + serviços que implementam **RN** essenciais e transições de OS). Medir com ferramenta do ecossistema (ex.: c8, istanbul via Vitest/Jest).

---

## 2. Mapeamento NF → evidência

| NF | Evidência esperada | Ferramenta / método (explícito no relatório) |
| -- | ------------------ | --------------------------------------------- |
| NF-01 | Relatório Lighthouse ou GTmetrix nas páginas críticas | Lighthouse, GTmetrix |
| NF-02 | Relatório OWASP ZAP + evidência HTTPS/OIDC | OWASP ZAP |
| NF-03 | Matriz de dispositivos testados ou screenshots | Manual + devtools responsivos |
| NF-04 | Logs de health check + teste com RabbitMQ parado | Scripts manuais/automáticos |
| NF-05 | Consulta a log com quem/quando/valor anterior | Verificação manual na **coleção MongoDB** de auditoria (PostgreSQL não substitui esta evidência) |
| NF-06 | Relatório de carga 50 usuários | k6, Artillery, ou similar |
| NF-07 | Uptime homologação > 99% | Monitor externo ou logs do provedor |
| NF-08 | Métricas de fila sob carga | RabbitMQ management + testes |
| NF-09 | Upload 800 MB completo com sucesso | Teste manual ou automatizado longo |
| NF-10 | Política de backup + simulação de restore | Documento + evidência do provedor |
| NF-11 | Relatório axe / Lighthouse a11y | axe, Lighthouse |
| NF-12 | Amostra de logs estruturados em homologação | Stack de logging |

Armazenar evidências na pasta `docs/evidencias/` (ou repositório separado) com data.

---

## 3. Segurança (além do ZAP)

- Validação de entrada em todos os DTOs (class-validator ou equivalente).
- Rate limiting em rotas públicas (login, recuperação senha, ingestão IoT se exposta).
- Segredos apenas em variáveis de ambiente; nunca no Git.
- Revisão de dependências (npm audit / Dependabot) na CI.

---

## 4. Testes de resiliência (cenários mínimos)

1. RabbitMQ indisponível: API continua degradada com fila local ou erro controlado (**NF-04**).
2. Airtable indisponível: OS concluída persiste; sync retenta; operador pode reprocessar manualmente.
3. Arduino offline: simulação **RF-19** ainda gera OS para demo.

---

## 5. Atualização

Após cada sprint de QA, anexar resumo de cobertura e links para relatórios NF neste arquivo ou em `docs/evidencias/README.md`.
