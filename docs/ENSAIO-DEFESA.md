# Ensaio de defesa — roteiro (DDE)

**Data alvo:** até 01/07/2026  
**Duracao sugerida:** 25–30 min demonstracao + perguntas

## 1. Abertura (2 min)

- Problema: gestao de manutencao industrial com rastreabilidade e integracao.
- Arquitetura: NestJS hexagonal + Next.js + Postgres/Mongo/RabbitMQ/Redis.

## 2. IAM (3 min)

- Login Supabase → `/workspace/acesso`
- RBAC: tecnico vs gestor (home diferente)
- Convite e redefinir senha

## 3. Core — OS e ativos (8 min)

- Criar OS, atribuir tecnico, iniciar execucao
- Fechar com foto + assinatura + pecas (RN-02, RN-07)
- Historico no ativo (RF-17)
- Bloqueio pos-fechamento (RN-15)

## 4. Integracao e resiliencia (5 min)

- `/workspace/integracoes`: webhook + API key
- Simular falha → circuit breaker (NF-08)
- API parceiro (substitui Airtable) — ver [IoT-ESCOPO-DDE.md](IoT-ESCOPO-DDE.md)

## 5. Tempo real e KPIs (4 min)

- Notificacao push (WebSocket)
- Dashboard executivo (gestor)
- Health `/health` (NF-04)

## 6. Compliance (3 min)

- Auditoria: quem/quando/valor anterior (NF-05)
- Export CSV

## 7. IoT — próxima entrega (2 min)

- RN-01 / RF-09 em implementação após homologação
- Interoperabilidade já entregue: API parceiro + webhook + health IoT

## 8. Encerramento

- Evidências NF em `docs/evidencias/` + URLs em [HOMOLOG-URL.md](HOMOLOG-URL.md)
- Checklist: [CHECKLIST-DEFESA-DDE.md](CHECKLIST-DEFESA-DDE.md)

## Checklist pre-ensaio

- [ ] Stack Docker + backend + frontend rodando
- [ ] Usuario gestor e tecnico de teste
- [ ] Webhook de teste configurado
- [ ] Slides alinhados a [STATUS-MODULOS-OBRIGATORIOS.md](STATUS-MODULOS-OBRIGATORIOS.md)
