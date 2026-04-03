# Cronograma e fases de implementação

**Prazo fixo:** 02/07/2026 (DDE). Este cronograma é um plano de engenharia; ajustar datas conforme capacidade real, mantendo a **ordem de dependências** do [00-PLANO-MAESTRO.md](00-PLANO-MAESTRO.md).

---

## Fase 0 — Fundação (semanas 1–2)

- Repositório Git, política de branches, Docker Compose (API, worker, RabbitMQ, DB).
- “Walking skeleton”: deploy hello API Railway + frontend Vercel, variáveis de ambiente.
- CI: build + testes + lint (GitHub Actions).
- Esboço OpenAPI ou convenções em [07-API-REST-E-CONTRATOS.md](07-API-REST-E-CONTRATOS.md) alinhado ao primeiro recurso real.
- **Entregáveis:** pipeline verde, documentação de como subir o ambiente.
- **Rastreio:** suporta risco “deploy homologação” e “familiaridade NestJS/RabbitMQ/Docker”.

---

## Fase 1 — IAM e unidade fabril (semanas 2–4)

- Integração Supabase Auth (**RF-02**, **NF-02**).
- Modelo de perfis: Técnico, Supervisor, Gestor, Auditor, Admin (**RF-01**, **RF-03**, **RF-16**).
- Escopo por unidade (**RN-08**); seeds de `UnidadeFabril`.
- Auditoria de login e ações IAM (**RN-04** subset).
- **Critério:** usuários criados; acesso negado fora do perfil/unidade.

---

## Fase 2 — Core: Ativo e OS (semanas 4–8)

- CRUD Ativo (**RF-04**, **RN-06**).
- CRUD OS manual (**RF-05**, **RN-05**, **RN-10**).
- Máquina de estados OS (**RF-07** parcial até “em execução”).
- Histórico de manutenção por ativo (**RF-17**).
- **Critério:** DDE “CRUD completo com validação obrigatória” em progresso.

---

## Fase 3 — Fechamento rígido e mídia (semanas 7–10)

- Upload assíncrono até 800 MB (**RF-10**, **NF-09**).
- Fechamento com foto + assinatura (**RN-02**); corretiva com problema/solução (**RN-13**).
- Tempo de execução (**RN-11**); bloqueio pós-fechamento (**RN-15**).
- Atualização automática status ativo (**RN-14**).
- **Critério:** aceitação DDE item fechamento OS.

---

## Fase 4 — Auditoria completa (semanas 8–11, paralelo)

- Log de alterações em ativos, OS, status, eventos temperatura (**RF-14**, **NF-05**, **RN-04**).
- UI consulta para Auditor/Gestor.
- Exportação audit (**RN-12**).
- Persistência dual: trilha em **MongoDB**; negócio em **PostgreSQL** (ver [11-MODELO-DADOS-ESTENDIDO-E-BPMN.md](11-MODELO-DADOS-ESTENDIDO-E-BPMN.md) §3).

---

## Fase 5 — IoT, fila e OS preditiva (semanas 10–14)

- Ingestão leituras (API dedicada ou MQTT→adapter conforme hardware).
- Consumer RabbitMQ; **RN-01** (três leituras consecutivas); idempotência.
- Simulação **RF-19**.
- Notificações **RN-09**; alinhamento **RF-06**.
- **Critério:** DDE “evento IoT cria OS preditiva”.

---

## Fase 6 — Tempo real (semanas 12–15)

- WebSocket: temperatura (**RF-09**), status OS (**RF-18**), notificações (**RF-11**).
- **Critério:** ERS critérios RF-09, RF-11, RF-18.

---

## Fase 7 — Dashboard e KPIs (semanas 14–17)

- MTBF, MTTR, OEE, % preventivas vs corretivas, custo mensal (**RF-08**).
- Recharts; controle **RN-03**.
- **Critério:** KPIs atualizados (tempo real conforme definido no relatório).

---

## Fase 8 — Airtable e resiliência (semanas 16–19)

- Cliente REST, fila ou outbox, circuit breaker (**RF-15**, **NF-04**, **NF-08**).
- Fallback manual (risco limite API Airtable).
- Health checks em todos os serviços.

---

## Fase 9 — Qualidade, acessibilidade e relatórios (semanas 18–22)

- Cobertura **80%** regras críticas (domínio + integrações-chave).
- Filtros **RF-12**, **RF-20**; relatórios **RF-21**; export **RF-13**.
- **NF-01**, **NF-03**, **NF-11**, **NF-12**, **NF-06**, **NF-07**, **NF-10** conforme prioridade.

---

## Fase 10 — Encerramento acadêmico (junho–início julho)

- Manual do usuário por perfil (entregável DDE; esqueleto em [10-MANUAL-DO-USUARIO-ESQUELETO.md](10-MANUAL-DO-USUARIO-ESQUELETO.md)).
- DEI: wireframes/mockups conforme [06-DEI-NAVEGACAO-E-PERFIS.md](06-DEI-NAVEGACAO-E-PERFIS.md).
- Ensaio defesa com hardware físico.
- Revisão final da rastreabilidade em [04-REGRAS-DE-NEGOCIO-E-RASTREABILIDADE.md](04-REGRAS-DE-NEGOCIO-E-RASTREABILIDADE.md).

---

## Marcos de aceitação (checklist DDE 1.9)

Usar como gate antes da entrega final:

- [ ] CRUD ativos e OS + validação
- [ ] Login + RBAC + auditoria
- [ ] IoT/simulação → OS preditiva
- [ ] Dashboard KPIs tempo real
- [ ] Airtable com envio automático
- [ ] UI responsiva
- [ ] Health + circuit breaker
- [ ] Deploy HTTPS homologação
- [ ] Testes ≥ 80% regras críticas

---

## Atualização

Ao fechar cada fase: marcar data real, desvio em dias e lições (subseção opcional abaixo).

### Registro de execução

| Fase | Previsto | Realizado | Notas |
| ---- | -------- | --------- | ----- |
| 0 | _TBD_ | | |
| 1 | _TBD_ | | |
| … | | | |
