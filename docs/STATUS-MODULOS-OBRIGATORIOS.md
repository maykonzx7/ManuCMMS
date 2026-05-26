# STATUS DOS MODULOS OBRIGATORIOS (DDE)

Atualizado em: 26/05/2026

## 1) IAM (Gestao de Identidade) - 94%

- Implementado:
  - Login/logout com Supabase + sessao por cookie HttpOnly (`/auth/session`).
  - Resolucao de login por identificador (`/auth/resolve-login`).
  - Recuperacao de senha self-service (Supabase + `/workspace/acesso/redefinir-senha`).
  - RBAC por perfil e permissao no backend.
  - Escopo por unidade com validacoes server-side.
  - Permissao `dashboard.executivo` (RN-03) — KPIs restritos a Gestor/Admin.
  - Gestao de usuarios/convites/perfis/cargos.
- Pendente para 100%:
  - Endurecimento adicional de sessao (rotacao/expiracao configuravel por risco).

## 2) Core Business (Dominio) - 96%

- Implementado:
  - CRUD de unidades, ativos e ordens de servico.
  - Assinatura digital obrigatoria no fechamento (RN-02).
  - Estoque/pecas com consumo no fechamento (RN-07).
  - CRUD pecas (PATCH/DELETE) + aba movimentacoes (saida por OS).
  - Historico de OS por ativo (RF-17).
  - Bloqueio pos-fechamento (RN-15) with edicao restrita.
  - Filtros server-side na listagem de OS (RF-12/RF-20).
  - Prioridade de OS no schema e UI.
- Pendente para 100%:
  - Relatorio PDF dedicado de estoque (export analitico).

## 3) Comunicacao e Eventos (Messageria) - 88%

- Implementado:
  - RabbitMQ e Redis operacionais via Docker.
  - Notificacoes internas de OS (atribuicao/reatribuicao/conclusao/SLA).
  - WebSocket `/realtime` — push de notificacoes (RF-11) e status de OS (RF-18).
  - Webhook outbound assincrono pos-fechamento + circuit breaker.
  - API de parceiro (leitura) com `x-api-key`.
  - Envio de email com link direto para a OS.
- Pendente para 100%:
  - Fluxo IoT completo (RN-01) — **adiado**.

## 4) Inteligencia de Dados (Dashboard Executivo) - 78%

- Implementado:
  - KPIs executivos via API (`/dashboard/executivo`).
  - Home diferenciada: Tecnico (minhas OS) vs Gestor (KPIs).
  - Exportacoes de relatorios.
  - API de parceiro expoe KPIs por unidade.
- Pendente para 100%:
  - Grafico de temperatura IoT (RF-09) — **adiado**.
  - Evidencia formal de tempo real em ambiente HTTPS publico.

## 5) Auditoria e Log (transversal) - 82%

- Implementado:
  - Persistencia dual (Postgres + Mongo) para trilhas.
  - Listagem, filtro, detalhe e exportacao CSV de auditoria.
  - Registro de eventos de sessao (LOGIN) em trilha de auditoria.
  - Infra de saude para servicos criticos.
- Pendente para 100%:
  - Politica de retencao e arquivamento de logs.
  - Dashboard de observabilidade (erros, latencia, volume de eventos).

## Resumo geral atual

- Cobertura estimada dos 4 modulos obrigatorios: **~89%**
- Entregue nesta rodada (Fases A–D):
  - Core (RN-02, RN-07, RF-17, RN-15, filtros, prioridade)
  - IAM (RF-02, RN-03)
  - Interoperabilidade (API parceiro + webhook + circuit breaker)
  - WebSocket RF-11/RF-18
  - CI frontend + guia deploy homologacao
- Risco residual para defesa:
  - IoT preditivo ponta a ponta (escopo adiado)
  - Evidencias NF publicadas (Lighthouse, responsividade, backup)
  - Deploy HTTPS homologacao executado e documentado com URL publica
