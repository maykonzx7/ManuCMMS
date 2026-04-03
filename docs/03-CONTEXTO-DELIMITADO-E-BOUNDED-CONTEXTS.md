# Bounded contexts e integração entre contextos

Mapa derivado dos **contextos** nomeados nos requisitos funcionais (campo “Contexto:” no ERS) e dos módulos do DDE.

---

## 1. Mapa de contextos

| Contexto | Responsabilidade principal | Agregados / conceitos centrais |
| -------- | --------------------------- | -------------------------------- |
| **Identity & Access (IAM)** | Usuários, perfis, permissões por unidade | Usuario (perfil), vínculo Unidade, políticas RBAC |
| **Plant Operations (Unidade)** | Cadastro de unidades fabris, isolamento de dados | UnidadeFabril |
| **Asset Management** | Ciclo de vida do ativo, limites térmicos, status operacional | Ativo |
| **Work Order (Manutenção)** | OS corretiva, preventiva, preditiva; execução e fechamento | OrdemServico |
| **Telemetry & Alerts (IoT)** | Leituras de temperatura, detecção de crítico, simulação | LeituraSensor, contador de leituras consecutivas (**RN-01**) |
| **Notifications** | Entrega de alertas a técnicos e supervisores | Notificação, assinaturas WebSocket |
| **Analytics & Reporting** | KPIs, gráficos, exportações | Projeções leitura, agregações temporais |
| **Compliance (Auditoria)** | Trilha de alterações | LogAuditoria |
| **ERP Integration (Airtable)** | Envio de OS concluídas, custos, peças | Registros externos mapeados via ACL |

---

## 2. Relacionamentos (context mapping)

- **IAM** é **Generic Subdomain** consumido por todos: o token/sessão carrega `id_usuario`, `id_unidade`, `perfil`.
- **Plant Operations** + **Asset** + **Work Order** formam o **Core Domain**; preferir transação única quando a operação for invariante entre Ativo e OS (**RN-05**, **RN-10**, **RN-14**).
- **Telemetry** → **Work Order**: relação **Upstream–Downstream**; IoT publica eventos; Core consome via anti-corruption na borda (mensagens versionadas).
- **Airtable**: **Anti-Corruption Layer** obrigatório; o domínio não conhece nomes de colunas/base do Airtable.
- **Auditoria**: **Supporting Domain**; persistência dedicada em **MongoDB** (porta `IAuditLog`), enquanto o estado de negócio permanece em **PostgreSQL** — ver [11-MODELO-DADOS-ESTENDIDO-E-BPMN.md](11-MODELO-DADOS-ESTENDIDO-E-BPMN.md) §3.

---

## 3. Contratos entre contextos (evolução controlada)

Definir contratos estáveis (versionados):

1. **Evento de telemetria** (fila): identificador do ativo, valor, timestamp, id de correlação.
2. **Evento de domínio** `OrdemServicoConcluida`: ids, tipo, custos, peças (quando existir **RN-07**), unidade.
3. **Comando** `CriarOSPreditiva`: ativoId, motivo, limite ultrapassado, origem IoT|Simulação.

Qualquer mudança de contrato exige: incremento de versão da mensagem, atualização deste arquivo e entrada no changelog do [00-PLANO-MAESTRO.md](00-PLANO-MAESTRO.md).

---

## 4. Ubiquitous language (glossário mínimo)

Termos do DEM / ERS a manter no código e na API:

- Unidade fabril, Ativo, Ordem de Serviço (OS), Técnico, Supervisor, Gestor, Auditor, Administrador.
- Tipos de OS: Corretiva, Preventiva, Preditiva.
- Status de OS: Aberta, Em execução, Concluída, Cancelada (ajustar nomenclatura técnica a ENUM do DEM).

---

## 5. Atualização

Ao criar novas entidades (ex.: Peça/Estoque para **RN-07**), adicionar linha na tabela do mapa e definir relacionamento com Work Order.
