# Modelo de dados estendido, decisões ORM e BPMN (texto)

Fecha lacunas entre o **DEM mínimo** e regras que exigem entidades adicionais; registra critério de escolha **Prisma vs TypeORM**; descreve o **BPMN** citado na seção 3.5 do relatório (figura no PDF).

---

## 1. Lacunas do dicionário DEM vs ERS

| Origem | Necessidade | Proposta de modelagem |
| ------ | ----------- | --------------------- |
| **RN-06** | Limite por **grupo** de ativos | **Decisão 2026-04-03 (v1):** limite só em **`Ativo.limite_temp`** (default 48 °C). `GrupoAtivo` + `AtivoGrupo` ficam para evolução futura se precisar limite compartilhado. |
| **RN-07** | Estoque de peças | Entidades `Peca`, `MovimentoEstoque`, vínculo `OrdemServicoPeca` (quantidade consumida). Validação no fechamento da OS. |
| **RF-05** | Checklist | Entidade `ChecklistTemplate` + `OrdemServicoItemChecklist` (opcional por OS). |
| **DDE** | Custos e peças para Airtable | Campos de custo na OS ou entidade `CustoOS`; peças via **RN-07** quando existir. |
| Apêndice PlantUML | `OrdemServico` sem `Cancelada` / `Falha` no enum de status | Alinhar ao DEM 3.1.2 (status completos) e ao diagrama de estados. |

Qualquer tabela nova entra no **dicionário de dados** do relatório acadêmico na próxima revisão formal.

---

## 2. Prisma vs TypeORM (decisão orientada — preencher data)

| Critério | Prisma | TypeORM |
| -------- | ------ | ------- |
| DX e migrações | Forte, schema declarativo | Flexível, decorators |
| Hexagonal | Gerado client na infra; domínio sem importar `@prisma/client` nos agregados | Similar se usar Data Mapper |
| Timeboxing TCC | Curva menor para CRUD rápido | Mais verboso para equipes já em JPA-like |

**Recomendação de processo:** escolher **uma** opção na Fase 0, registrar em [00-PLANO-MAESTRO.md](00-PLANO-MAESTRO.md), não misturar ORMs no mesmo serviço.

---

## 3. Persistência dual (decisão do projeto)

O sistema utiliza **os dois bancos em paralelo**, com papéis fixos:

| Banco | Papel | Conteúdo |
| ----- | ----- | -------- |
| **PostgreSQL** (Supabase) | Sistema de registro **transacional** | Unidade fabril, usuário (metadados/perfil além do Auth), ativo, ordem de serviço, peças/estoque (**RN-07**) quando existirem, relacionamentos FK do DEM. |
| **MongoDB** | **Auditoria** e trilha de conformidade | Coleção (ex.: `log_auditoria`) espelhando o dicionário `LogAuditoria`: `id_log`, `id_usuario`, `entidade_afetada`, `id_registro`, `valor_anterior`, `valor_novo`, `data_hora`. Índices sugeridos: `data_hora`, `entidade_afetada` + `id_registro`, `id_usuario`. |

**Regras de implementação**

- O domínio expõe a porta `IAuditLog`; o adaptador **só** persiste em MongoDB (não criar tabela `LogAuditoria` em PostgreSQL para evitar duplicidade e divergência).
- Fluxo típico: commit da transação **PostgreSQL** → em seguida append do documento de auditoria no **MongoDB**. Se o Mongo falhar, registrar falha (**NF-12**), retentar (fila leve ou outbox) para não perder trilha (**RN-04**).
- Consultas **RF-14** / export **RN-12** leem **apenas** MongoDB; relatórios operacionais que cruzem “quem fez” com nome de usuário podem fazer join em aplicação (PG por `id_usuario` + log Mongo) ou desnormalizar `nome_usuario` no documento de audit no momento da escrita (trade-off de consistência).

**NF-05:** evidência de teste em **MongoDB** conforme ERS; PostgreSQL cobre integridade do negócio.

---

## 4. BPMN — processo de manutenção preditiva (narrativa)

Fluxo ponta a ponta compatível com **RF-06**, **RN-01**, **RN-09**:

1. **Início** — leitura periódica de temperatura (IoT ou simulação).
2. **Gateway** — três leituras consecutivas acima do limite do ativo?
   - Não → retorno ao monitoramento.
   - Sim → **criar OS preditiva** vinculada ao ativo (**RN-05**).
3. **Tarefa automática** — notificar técnico e supervisor (**RN-09**).
4. **Tarefa humana** — técnico executa OS (estados do diagrama de estados DEM).
5. **Gateway** — fechamento válido (foto + assinatura **RN-02**; corretiva **RN-13**)?
6. **Atualizar ativo** (**RN-14**).
7. **Envio assíncrono** ao Airtable (**RF-15**).
8. **Fim**.

Manter diagrama BPMN 2.0 no mesmo tooling do relatório (figura 5) e referenciar este texto para consistência.

---

## 5. Consistência com diagramas do DEM

- **Diagrama de sequência IoT:** alinhar atores (dispositivo, API, fila, worker, domínio, notificação) ao [07-API-REST-E-CONTRATOS.md](07-API-REST-E-CONTRATOS.md).
- **Diagrama de estados da OS:** transições devem refletir **RN-15** (estado terminal) e cancelamento se existir no enum.

---

## 6. Atualização

**RN-06:** decisão registrada no plano maestro (v1 = limite por ativo). **RN-07** (estoque): mover para “Decisão tomada” no plano maestro com data quando implementada.  
Alteração no schema de documentos Mongo: versionar e atualizar índices neste arquivo.
