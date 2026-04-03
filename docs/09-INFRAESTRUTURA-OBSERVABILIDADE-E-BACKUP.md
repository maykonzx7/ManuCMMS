# Infraestrutura, deploy e observabilidade

Cobre o que o sumário indica em **5.2.7 Requisitos de Infraestrutura**, **5.3 Repositório**, health checks (**NF-04**, **NF-07**, **NF-12**) e **NF-10** (backup).

---

## 1. Ambientes

| Ambiente | Finalidade | Alvo explícito no DDE |
| -------- | ---------- | ---------------------- |
| Local | Desenvolvimento com paridade razoável | Docker Compose |
| Homologação | Demonstração pública com HTTPS | Vercel (frontend) + Railway (backend) |
| CI | Build, testes, lint, opcional deploy | GitHub Actions |

---

## 2. Componentes no Docker Compose (local)

Serviços mínimos sugeridos (ajustar nomes ao implementar):

- API NestJS
- Worker (consumer RabbitMQ)
- RabbitMQ (management plugin opcional)
- Redis (opcional: cache Airtable / rate limit / sessão)
- **PostgreSQL** — dados transacionais (paridade com Supabase em dev)
- **MongoDB** — auditoria (**RN-04**, **NF-05**); obrigatório em todos os ambientes onde a API gravar logs de conformidade

---

## 3. Health checks

Cada serviço exposto deve oferecer:

- `GET /health` (ou `/ready`) — dependências: **PostgreSQL**, **MongoDB**, fila, storage (conforme uso).
- Versão da API (`/version` opcional) para suporte.

**NF-04 / NF-07:** monitor externo (ex.: UptimeRobot) batendo em `/health` do backend homologado.

---

## 4. Observabilidade e logs (**NF-12**)

- Formato **JSON** em produção/homologação: `timestamp`, `level`, `correlationId`, `userId`, `unidadeId`, `mensagem`.
- Correlation ID propagado HTTP → fila → workers.
- Não logar tokens, senhas ou assinaturas completas.

---

## 5. Backup e recuperação (**NF-10** — Importante)

- **PostgreSQL (Supabase):** backups automáticos do plano; documentar RPO/RTO aceitos para o TCC.
- **MongoDB:** snapshot ou backup agendado do provedor (Atlas, Railway addon, etc.); **NF-10** exige procedimento de restauração testado para a coleção de auditoria.
- **Arquivos grandes (800 MB):** storage com versionamento ou backup do bucket (S3/R2/Supabase Storage).
- **Procedimento:** documento curto “Como restaurar” + **simulação registrada** (critério NF-10).

---

## 6. CI/CD (mitigação de risco DDE)

- Pipeline: install → lint → test → build.
- Deploy automático para homologação em branch definida (ex.: `main`), com secrets no GitHub.
- Falha de deploy não deve apagar dados; usar migrações reversíveis quando possível.

---

## 7. Repositório e código-fonte (**5.3**)

- Estrutura de pastas alinhada à **hexagonal** (documentada em `01-...`).
- README raiz: como subir Docker, variáveis `.env.example`, link para `docs/`.
- Commits referenciando RF/RN quando aplicável.

---

## 8. Atualização

Alteração de provedor (ex.: trocar Railway) ou de região: registrar data, motivo e impacto em **NF-07**.
