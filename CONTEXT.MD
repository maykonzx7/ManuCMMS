# ManuCMMS — índice da documentação de engenharia

Este repositório contém o relatório fonte (`V2.ManuCMMS PDSOB_PDSCOB 2026 - AESA-CESA.md`) e a **documentação viva de desenvolvimento** em `docs/`.

## Ordem de leitura recomendada

1. [docs/00-PLANO-MAESTRO.md](docs/00-PLANO-MAESTRO.md) — governança, o que fazer primeiro, como atualizar após cada entrega.
2. [docs/05-CRONOGRAMA-E-FASES.md](docs/05-CRONOGRAMA-E-FASES.md) — fases, dependências e marcos até 02/07/2026.
3. [docs/01-ARQUITETURA-HEXAGONAL-DDD.md](docs/01-ARQUITETURA-HEXAGONAL-DDD.md) — arquitetura, camadas, integrações.
4. [docs/03-CONTEXTO-DELIMITADO-E-BOUNDED-CONTEXTS.md](docs/03-CONTEXTO-DELIMITADO-E-BOUNDED-CONTEXTS.md) — bounded contexts e contratos.
5. [docs/04-REGRAS-DE-NEGOCIO-E-RASTREABILIDADE.md](docs/04-REGRAS-DE-NEGOCIO-E-RASTREABILIDADE.md) — RN ↔ código/RF/NF.
6. [docs/02-PADROES-DE-DESIGN.md](docs/02-PADROES-DE-DESIGN.md) — padrões adotados e onde aplicam.

### Documentos que fecham lacunas do sumário / entregáveis

7. [docs/06-DEI-NAVEGACAO-E-PERFIS.md](docs/06-DEI-NAVEGACAO-E-PERFIS.md) — DEI: áreas da UI, fluxo de navegação, matriz perfil × permissão, checklist wireframe/mockup.  
8. [docs/07-API-REST-E-CONTRATOS.md](docs/07-API-REST-E-CONTRATOS.md) — caracterização REST, WebSocket, IoT e Airtable (§5.2.8 / 5.2.9).  
9. [docs/08-ESTRATEGIA-DE-TESTES-SEGURANCA-E-NF.md](docs/08-ESTRATEGIA-DE-TESTES-SEGURANCA-E-NF.md) — testes, cobertura 80%, NF-01 a NF-12, ZAP, carga, acessibilidade.  
10. [docs/09-INFRAESTRUTURA-OBSERVABILIDADE-E-BACKUP.md](docs/09-INFRAESTRUTURA-OBSERVABILIDADE-E-BACKUP.md) — Docker, deploy, health, logs, backup (NF-10), CI/CD.  
11. [docs/10-MANUAL-DO-USUARIO-ESQUELETO.md](docs/10-MANUAL-DO-USUARIO-ESQUELETO.md) — estrutura do manual por perfil (entregável DDE §6).  
12. [docs/11-MODELO-DADOS-ESTENDIDO-E-BPMN.md](docs/11-MODELO-DADOS-ESTENDIDO-E-BPMN.md) — RN-06/RN-07, ORM, auditoria, narrativa BPMN.
13. [docs/13-EMPRESA-IAM-MULTI-TENANT-E-DEPLOY.md](docs/13-EMPRESA-IAM-MULTI-TENANT-E-DEPLOY.md) — desenho de `Empresa` como tenant, onboarding por convite temporário, RBAC por cargo/permissão e estratégia de deploy/homologação com uso controlado de `ngrok`.

## Lembrete — Auth Supabase (a completar depois)

O backend já **valida JWT** (`SupabaseJwtStrategy`, guard global, `@Public()` em rotas abertas). O que **falta para auth funcional de ponta a ponta**:

- Preencher **`SUPABASE_URL`** e **`SUPABASE_JWT_SECRET`** no `backend/.env` com o projeto real (Dashboard → Settings → API); em dev, fallbacks só servem para subir a API sem configurar ainda.
- **Frontend**: Supabase client (login, refresh, sessão), enviar `Authorization: Bearer` nas chamadas à API.
- **Domínio / dados**: o **`UsuarioBootstrapGuard`** cria automaticamente **`public.usuario`** no primeiro request autenticado (`auth_sub` = `sub`, unidade padrão via `AUTH_BOOTSTRAP_UNIDADE_ID` ou primeira unidade). Falta **RN-08** (validar `:unidadeId` contra `usuarioLocal`), **RF-01** e políticas por perfil.
- **Alternativa no Supabase**: trigger em **`auth.users`** para inserir em `public.usuario` no signup (sem passar pela API); exige SQL no projeto e mesma base.

## Persistência

- **PostgreSQL** (Supabase): dados transacionais do CMMS.  
- **MongoDB**: somente **auditoria** (**RN-04**, **NF-05**, **RF-14**). Detalhes em [docs/11-MODELO-DADOS-ESTENDIDO-E-BPMN.md](docs/11-MODELO-DADOS-ESTENDIDO-E-BPMN.md) §3.

## Regra de atualização

Após cada implementação significativa: atualizar a coluna **Status / Notas** em `04-REGRAS-DE-NEGOCIO-E-RASTREABILIDADE.md`, o **changelog** em `00-PLANO-MAESTRO.md` e os itens concluídos em `05-CRONOGRAMA-E-FASES.md`.
