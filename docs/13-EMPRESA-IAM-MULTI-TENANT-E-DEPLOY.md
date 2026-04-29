# Empresa, IAM, multi-tenant e deploy

Documento de consolidação para a próxima evolução do ManuCMMS: introduz `Empresa` como raiz de isolamento corporativo, preserva a linguagem ubíqua já adotada no projeto e define um caminho seguro para homologação pública controlada.

---

## 1. Decisão de linguagem e modelagem

- O termo técnico **tenant** será representado no domínio por **Empresa**.
- A linguagem ubíqua permanece consistente com os demais documentos: **Empresa**, **Unidade Fabril**, **Usuário**, **Cargo**, **Permissão**, **Ativo** e **Ordem de Serviço**.
- `themeMode` permanece **global** no sistema, fora da personalização por empresa.
- A mensagem de boas-vindas permanece **global**.

### 1.1 Objetivo da modelagem

Permitir:

- isolamento forte de dados por empresa;
- múltiplas unidades fabris dentro da mesma empresa;
- controle de acesso granular por cargo e por unidade fabril;
- convite seguro por email temporário para primeiro acesso;
- crescimento do sistema sem quebrar o vocabulário do relatório acadêmico.

---

## 2. Desenho do domínio

### 2.1 Visão estrutural

```text
Empresa
  ├── UnidadeFabril
  │     ├── Ativo
  │     └── OrdemServico
  ├── UsuarioEmpresa
  │     └── UsuarioCargo
  ├── Cargo
  │     └── CargoPermissao
  └── ConviteAcesso

Usuario
  └── UsuarioEmpresa

Permissao
  └── CargoPermissao
```

### 2.2 Entidades centrais

#### Empresa

Representa o isolamento principal do sistema.

Campos mínimos:

- `id`
- `nome_empresa`
- `slug`
- `status`
- `created_at`
- `updated_at`

Regras:

- `slug` único no sistema;
- `slug` usado na URL pública;
- `status` controla ativação, bloqueio e suspensão;
- toda entidade operacional deve carregar `empresa_id`.

#### UnidadeFabril

Continua sendo a unidade operacional da empresa.

Campos mínimos:

- `id`
- `empresa_id`
- `nome`
- `localizacao`
- `status`
- `created_at`
- `updated_at`

Regras:

- uma empresa pode ter várias unidades fabris;
- o isolamento fino do dia a dia continua por unidade fabril, conforme **RN-08**.

#### Usuario

Identidade global da pessoa autenticada.

Campos mínimos:

- `id`
- `auth_sub`
- `email`
- `nome`
- `status`
- `created_at`
- `updated_at`

Regras:

- `auth_sub` segue sendo o vínculo com o Supabase Auth;
- um usuário pode participar de mais de uma empresa, se a regra futura permitir.

#### UsuarioEmpresa

Vínculo do usuário com a empresa.

Campos mínimos:

- `id`
- `usuario_id`
- `empresa_id`
- `status`
- `is_responsavel_principal`
- `created_at`
- `updated_at`

Regras:

- define se o usuário pertence à empresa;
- o primeiro usuário corporativo da empresa nasce aqui;
- usar índice único composto em `usuario_id + empresa_id`.

#### Cargo

Papel organizacional definido dentro da empresa.

Campos mínimos:

- `id`
- `empresa_id`
- `codigo`
- `nome`
- `descricao`
- `nivel_hierarquico`
- `is_sistema`
- `created_at`
- `updated_at`

Regras:

- cargos podem ser padrão do sistema ou personalizados pela empresa;
- `nivel_hierarquico` ajuda em fluxos de aprovação e delegação;
- `codigo` deve ser único por empresa.

#### Permissao

Catálogo global de capacidades do sistema.

Campos mínimos:

- `id`
- `codigo`
- `nome`
- `descricao`
- `modulo`

Exemplos:

- `empresa.gerenciar`
- `unidade.gerenciar`
- `usuario.convidar`
- `cargo.gerenciar`
- `ativo.criar`
- `ativo.editar`
- `os.criar`
- `os.executar`
- `os.fechar`
- `os.visualizar_unidade`
- `dashboard.visualizar`
- `auditoria.visualizar`
- `iot.simular`

#### CargoPermissao

Relaciona cargos às permissões.

Campos mínimos:

- `cargo_id`
- `permissao_id`
- `created_at`

#### UsuarioCargo

Relaciona o vínculo do usuário com os cargos da empresa.

Campos mínimos:

- `id`
- `usuario_empresa_id`
- `cargo_id`
- `id_unidade`
- `created_at`
- `updated_at`

Regras:

- permite cargo corporativo sem unidade específica quando `id_unidade` for nulo;
- permite cargo por unidade quando `id_unidade` estiver preenchido;
- viabiliza RBAC por empresa e por unidade fabril.

#### ConviteAcesso

Controla o onboarding seguro do primeiro acesso e de novos usuários.

Campos mínimos:

- `id`
- `empresa_id`
- `email_destino`
- `token_hash`
- `status`
- `expira_em`
- `convidado_por_usuario_id`
- `usuario_criado_id`
- `created_at`
- `updated_at`

Regras:

- nunca persistir o token puro, apenas hash;
- convite com validade curta;
- convite expirado não pode ser reutilizado;
- aceite de convite deve ser auditado no MongoDB.

---

## 3. Relações com o domínio atual

### 3.1 Estrutura recomendada

```text
Empresa 1 ── N UnidadeFabril
Empresa 1 ── N Cargo
Empresa 1 ── N ConviteAcesso
Empresa 1 ── N UsuarioEmpresa

Usuario 1 ── N UsuarioEmpresa
UsuarioEmpresa 1 ── N UsuarioCargo

Cargo N ── N Permissao

UnidadeFabril 1 ── N Ativo
UnidadeFabril 1 ── N OrdemServico

Ativo 1 ── N OrdemServico
```

### 3.2 Evolução das entidades existentes

#### Ativo

Adicionar:

- `empresa_id`
- manter `id_unidade`

#### OrdemServico

Adicionar:

- `empresa_id`
- manter `id_ativo`
- manter `id_tecnico`
- futuramente avaliar `criado_por_usuario_id`

#### Usuario local atual

O contexto autenticado deve evoluir para carregar:

- `idUsuario`
- `idEmpresa`
- `slugEmpresa`
- `idUnidadeAtual`
- `cargos`
- `permissoes`

---

## 4. Fluxo de onboarding seguro

### 4.1 Criação da empresa

1. Um **Administrador da Plataforma** cria a `Empresa`.
2. O sistema gera o primeiro `ConviteAcesso`.
3. O convite é enviado por email para o responsável inicial.
4. O destinatário acessa o link temporário.
5. O usuário define a própria senha no Supabase.
6. O sistema cria ou vincula `Usuario`, `UsuarioEmpresa` e os cargos iniciais.
7. Toda a operação é auditada no MongoDB.

### 4.2 Motivo para não enviar senha pronta

- email não é um canal confiável para senha permanente;
- convite temporário reduz exposição;
- senha nasce definida pelo próprio usuário;
- o fluxo fica mais compatível com autenticação segura e eventual MFA.

---

## 5. Regras de autorização

### 5.1 Hierarquia recomendada

- `Administrador da Plataforma`: fora da empresa; gerencia onboarding, status da empresa e suporte operacional.
- `Administrador`: autoridade máxima dentro da empresa.
- `Gestor`: visão ampla de unidade e indicadores conforme política.
- `Supervisor`: coordenação operacional.
- `Técnico`: execução e fechamento das próprias ordens.
- `Auditor`: leitura de trilha e conformidade.

### 5.2 Regras obrigatórias

- toda requisição autenticada deve resolver a `Empresa` ativa;
- toda leitura e escrita operacional deve filtrar por `empresa_id`;
- quando a operação for sensível à planta, também filtrar por `id_unidade`;
- o cliente não deve escolher livremente `empresa_id` no corpo da requisição;
- a API resolve contexto por URL, JWT e vínculo do usuário com a empresa.

---

## 6. URL pública e identificação da empresa

### 6.1 Formato recomendado

```text
/e/:empresaSlug
```

Exemplos:

- `/e/aesa-corporativo`
- `/e/metalurgica-sao-jose`

### 6.2 Regras do slug

- minúsculo;
- sem acento;
- sem espaço;
- hífen como separador;
- único no sistema;
- bloquear palavras reservadas como `admin`, `api`, `login`, `root`, `system`.

### 6.3 Observação de segurança

O `slug` é identificador público, não segredo. A segurança real continua sendo:

- autenticação;
- autorização por cargo e permissão;
- filtro por `empresa_id` e `id_unidade`.

---

## 7. Persistência e índices

### 7.1 PostgreSQL

Banco transacional principal:

- `empresa`
- `unidade_fabril`
- `usuario`
- `usuario_empresa`
- `cargo`
- `permissao`
- `cargo_permissao`
- `usuario_cargo`
- `ativo`
- `ordem_servico`

### 7.2 MongoDB

Auditoria obrigatória:

- criação da empresa;
- envio e aceite de convite;
- alteração de cargo;
- mudança de permissão;
- criação, atualização, cancelamento e fechamento de OS;
- mudança de status da empresa.

### 7.3 Índices mínimos recomendados

- `empresa.slug` único;
- `usuario.auth_sub` único;
- `usuario.email` único;
- `usuario_empresa(usuario_id, empresa_id)` único;
- `cargo(empresa_id, codigo)` único;
- `unidade_fabril(empresa_id, nome)`;
- `ativo(empresa_id, id_unidade)`;
- `ordem_servico(empresa_id, status, data_abertura)`;
- `usuario_cargo(usuario_empresa_id, cargo_id, id_unidade)`.

---

## 8. Deploy e produção

### 8.1 Estrutura recomendada para produção

Para o estágio atual do projeto, a estrutura mais equilibrada é:

- `frontend` em Vercel;
- `backend API` em Railway;
- `worker RabbitMQ` em Railway ou serviço separado equivalente;
- `PostgreSQL/Supabase` para dados transacionais;
- `MongoDB` gerenciado para auditoria;
- `RabbitMQ` gerenciado para mensageria;
- monitoramento externo batendo em `/health`.

### 8.2 Serviços lógicos

Mesmo sem microserviços, separar pelo menos:

- API HTTP
- worker de filas
- bancos gerenciados

Isso melhora:

- escalabilidade;
- isolamento de falhas;
- deploy independente da API e do consumer.

### 8.3 Controle operacional mínimo

- ambiente `local`;
- ambiente `homologacao`;
- ambiente `producao`;
- variáveis separadas por ambiente;
- `MongoDB` e `RabbitMQ` obrigatórios em homologação e produção;
- health checks distintos para API e worker;
- logs estruturados com `correlationId`, `empresaId`, `unidadeId` e `userId`.

---

## 9. Uso de ngrok

### 9.1 Onde o ngrok ajuda muito

- expor rapidamente a API local para testes externos;
- validar callbacks, webhooks e integrações;
- demonstrar a aplicação para orientador, cliente ou banca;
- testar frontend ou dispositivo IoT contra backend local;
- validar fluxo de autenticação e convites em ambiente controlado.

### 9.2 Onde o ngrok não deve ser tratado como produção

- não substitui hospedagem estável;
- não substitui observabilidade real;
- não substitui política séria de disponibilidade;
- não deve ser o endpoint oficial permanente do produto.

### 9.3 Estratégia recomendada

Usar o `ngrok` como **homologação pública temporária controlada**, não como produção.

Fluxo sugerido:

1. backend sobe localmente ou em servidor de homologação;
2. `ngrok` expõe HTTPs temporário;
3. somente usuários convidados validam;
4. logs e auditoria permanecem ativos;
5. após validação, desligar o túnel;
6. produção oficial segue em domínio fixo do ambiente hospedado.

### 9.4 Como manter controle do uso

- usar ambiente exclusivo de homologação;
- base de dados separada da produção;
- contas de teste ou convites restritos;
- lista curta de validadores;
- tokens temporários;
- auditoria de acessos sensíveis no MongoDB;
- banner visual indicando `HOMOLOGACAO`;
- desabilitar integrações destrutivas ou usar modo sandbox quando necessário.

### 9.5 Controle de exposição

O ideal é que qualquer exposição via `ngrok` tenha:

- data e hora de início;
- responsável pela sessão;
- URL temporária registrada;
- objetivo do teste;
- data e hora de encerramento.

Isso pode ser mantido em documento simples de operação ou em coleção de auditoria técnica.

---

## 10. Recomendação final

- Produção real: hospedagem estável, domínio fixo, bancos gerenciados, API e worker separados.
- Homologação pública controlada: `ngrok` ou domínio temporário equivalente.
- Multi-tenant seguro: `Empresa` como raiz de isolamento, `Unidade Fabril` como escopo operacional e RBAC por `Cargo` + `Permissão`.

---

## 11. Próximos passos

1. Refatorar o modelo Prisma para introduzir `Empresa` e vínculos de acesso.
2. Ajustar o contexto autenticado para carregar `empresaId`, `slugEmpresa`, cargos e permissões.
3. Criar fluxo de `ConviteAcesso` com expiração e aceite seguro.
4. Separar processo de API e worker no deploy.
5. Formalizar ambiente de homologação com uso controlado de `ngrok`.

---

## 12. Proposta de schema Prisma

Esta seção traduz o desenho do domínio para uma proposta concreta de `schema.prisma`, preservando os nomes já usados no projeto sempre que possível.

### 12.1 Enums novos

```prisma
enum StatusEmpresa {
  ATIVA
  SUSPENSA
  INATIVA
}

enum StatusUsuario {
  ATIVO
  INATIVO
  BLOQUEADO
}

enum StatusUsuarioEmpresa {
  ATIVO
  INATIVO
  PENDENTE
}

enum StatusUnidadeFabril {
  ATIVA
  INATIVA
}

enum StatusConviteAcesso {
  PENDENTE
  ACEITO
  EXPIRADO
  CANCELADO
}
```

### 12.2 Estrutura-alvo

```prisma
model Empresa {
  id            String           @id @default(uuid()) @db.Uuid
  nomeEmpresa    String           @map("nome_empresa") @db.VarChar(150)
  slug          String           @unique @db.VarChar(120)
  status        StatusEmpresa    @default(ATIVA)
  createdAt     DateTime         @default(now()) @map("created_at")
  updatedAt     DateTime         @updatedAt @map("updated_at")

  unidades      UnidadeFabril[]
  usuariosEmpresa UsuarioEmpresa[]
  cargos        Cargo[]
  convites      ConviteAcesso[]
  ativos        Ativo[]
  ordensServico OrdemServico[]

  @@map("empresa")
}

model UnidadeFabril {
  id            String               @id @default(uuid()) @db.Uuid
  empresaId     String               @map("empresa_id") @db.Uuid
  empresa       Empresa              @relation(fields: [empresaId], references: [id])
  nome          String               @db.VarChar(100)
  localizacao   String               @db.VarChar(255)
  status        StatusUnidadeFabril  @default(ATIVA)
  createdAt     DateTime             @default(now()) @map("created_at")
  updatedAt     DateTime             @updatedAt @map("updated_at")

  ativos        Ativo[]
  usuariosCargo UsuarioCargo[]

  @@index([empresaId])
  @@unique([empresaId, nome])
  @@map("unidade_fabril")
}

model Usuario {
  id              String            @id @default(uuid()) @db.Uuid
  authSub         String            @unique @map("auth_sub")
  nome            String            @db.VarChar(150)
  email           String            @unique @db.VarChar(100)
  status          StatusUsuario     @default(ATIVO)
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  usuariosEmpresa UsuarioEmpresa[]
  ordensComoTecnico OrdemServico[]  @relation("OsTecnico")
  convitesCriados ConviteAcesso[]   @relation("ConviteCriadoPor")
  convitesAceitos ConviteAcesso[]   @relation("ConviteAceitoPor")

  @@map("usuario")
}

model UsuarioEmpresa {
  id                     String               @id @default(uuid()) @db.Uuid
  usuarioId              String               @map("usuario_id") @db.Uuid
  empresaId              String               @map("empresa_id") @db.Uuid
  usuario                Usuario              @relation(fields: [usuarioId], references: [id])
  empresa                Empresa              @relation(fields: [empresaId], references: [id])
  status                 StatusUsuarioEmpresa @default(ATIVO)
  isResponsavelPrincipal Boolean              @default(false) @map("is_responsavel_principal")
  createdAt              DateTime             @default(now()) @map("created_at")
  updatedAt              DateTime             @updatedAt @map("updated_at")

  cargos                 UsuarioCargo[]

  @@unique([usuarioId, empresaId])
  @@index([empresaId])
  @@map("usuario_empresa")
}

model Cargo {
  id               String            @id @default(uuid()) @db.Uuid
  empresaId        String            @map("empresa_id") @db.Uuid
  empresa          Empresa           @relation(fields: [empresaId], references: [id])
  codigo           String            @db.VarChar(80)
  nome             String            @db.VarChar(120)
  descricao        String?           @db.VarChar(255)
  nivelHierarquico Int               @map("nivel_hierarquico")
  isSistema        Boolean           @default(false) @map("is_sistema")
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")

  permissoes       CargoPermissao[]
  usuariosCargo    UsuarioCargo[]

  @@unique([empresaId, codigo])
  @@index([empresaId, nivelHierarquico])
  @@map("cargo")
}

model Permissao {
  id          String           @id @default(uuid()) @db.Uuid
  codigo      String           @unique @db.VarChar(100)
  nome        String           @db.VarChar(120)
  descricao   String?          @db.VarChar(255)
  modulo      String           @db.VarChar(80)
  createdAt   DateTime         @default(now()) @map("created_at")

  cargos      CargoPermissao[]

  @@map("permissao")
}

model CargoPermissao {
  cargoId      String    @map("cargo_id") @db.Uuid
  permissaoId  String    @map("permissao_id") @db.Uuid
  cargo        Cargo     @relation(fields: [cargoId], references: [id])
  permissao    Permissao @relation(fields: [permissaoId], references: [id])
  createdAt    DateTime  @default(now()) @map("created_at")

  @@id([cargoId, permissaoId])
  @@map("cargo_permissao")
}

model UsuarioCargo {
  id               String         @id @default(uuid()) @db.Uuid
  usuarioEmpresaId String         @map("usuario_empresa_id") @db.Uuid
  cargoId          String         @map("cargo_id") @db.Uuid
  idUnidade        String?        @map("id_unidade") @db.Uuid
  usuarioEmpresa   UsuarioEmpresa @relation(fields: [usuarioEmpresaId], references: [id])
  cargo            Cargo          @relation(fields: [cargoId], references: [id])
  unidade          UnidadeFabril? @relation(fields: [idUnidade], references: [id])
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")

  @@index([usuarioEmpresaId])
  @@index([cargoId])
  @@index([idUnidade])
  @@map("usuario_cargo")
}

model ConviteAcesso {
  id                   String               @id @default(uuid()) @db.Uuid
  empresaId            String               @map("empresa_id") @db.Uuid
  emailDestino         String               @map("email_destino") @db.VarChar(100)
  tokenHash            String               @map("token_hash") @db.VarChar(255)
  status               StatusConviteAcesso  @default(PENDENTE)
  expiraEm             DateTime             @map("expira_em")
  convidadoPorUsuarioId String              @map("convidado_por_usuario_id") @db.Uuid
  usuarioCriadoId      String?              @map("usuario_criado_id") @db.Uuid
  createdAt            DateTime             @default(now()) @map("created_at")
  updatedAt            DateTime             @updatedAt @map("updated_at")

  empresa              Empresa              @relation(fields: [empresaId], references: [id])
  convidadoPorUsuario  Usuario              @relation("ConviteCriadoPor", fields: [convidadoPorUsuarioId], references: [id])
  usuarioCriado        Usuario?             @relation("ConviteAceitoPor", fields: [usuarioCriadoId], references: [id])

  @@index([empresaId, status])
  @@index([emailDestino])
  @@map("convite_acesso")
}
```

### 12.3 Evolução das tabelas já existentes

As tabelas operacionais centrais devem ganhar `empresa_id`:

```prisma
model Ativo {
  id            String         @id @default(uuid()) @db.Uuid
  empresaId     String         @map("empresa_id") @db.Uuid
  idUnidade     String         @map("id_unidade") @db.Uuid
  empresa       Empresa        @relation(fields: [empresaId], references: [id])
  unidade       UnidadeFabril  @relation(fields: [idUnidade], references: [id])
  nome          String         @db.VarChar(100)
  status        StatusAtivo    @default(OPERACIONAL)
  limiteTemp    Float          @default(48) @map("limite_temp")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  ordensServico OrdemServico[]

  @@index([empresaId, idUnidade])
  @@map("ativo")
}

model OrdemServico {
  id                String              @id @default(uuid()) @db.Uuid
  empresaId         String              @map("empresa_id") @db.Uuid
  idAtivo           String              @map("id_ativo") @db.Uuid
  idTecnico         String?             @map("id_tecnico") @db.Uuid
  empresa           Empresa             @relation(fields: [empresaId], references: [id])
  ativo             Ativo               @relation(fields: [idAtivo], references: [id])
  tecnico           Usuario?            @relation("OsTecnico", fields: [idTecnico], references: [id])
  tipo              TipoOrdemServico
  status            StatusOrdemServico  @default(ABERTA)
  descricao         String              @db.Text
  fotoAnexo         String?             @map("foto_anexo") @db.VarChar(2048)
  fotoProblema      String?             @map("foto_problema") @db.VarChar(2048)
  fotoSolucao       String?             @map("foto_solucao") @db.VarChar(2048)
  assinaturaDigital String?             @map("assinatura_digital") @db.Text
  dataAbertura      DateTime            @default(now()) @map("data_abertura")
  dataFechamento    DateTime?           @map("data_fechamento")

  @@index([empresaId, status, dataAbertura])
  @@index([idAtivo])
  @@index([idTecnico])
  @@map("ordem_servico")
}
```

### 12.4 Compatibilidade transitória

Durante a migração, o schema pode manter temporariamente no `Usuario`:

- `id_unidade`
- `perfil`

Esses campos só devem ser removidos depois que:

- `UsuarioEmpresa` estiver preenchido;
- `UsuarioCargo` estiver em uso;
- os casos de uso e controladores tiverem sido migrados para o novo modelo.

---

## 13. Plano de migração do modelo atual

### 13.1 Estado atual

Hoje o núcleo está assim:

- `Usuario` pertence diretamente a uma `UnidadeFabril`;
- `Usuario.perfil` é enum fixo;
- `Ativo` e `OrdemServico` não possuem `empresa_id`;
- o isolamento efetivo ainda é apenas por `id_unidade`.

### 13.2 Estratégia recomendada

Migrar em quatro fases:

1. **Expansão aditiva**
2. **Backfill dos dados**
3. **Troca de leitura e escrita da aplicação**
4. **Endurecimento e remoção do legado**

### 13.3 Fase 1 — expansão aditiva

Objetivo: criar o novo modelo sem quebrar o fluxo atual.

Adicionar:

- tabela `empresa`;
- `empresa_id` em `unidade_fabril`;
- `empresa_id` em `ativo`;
- `empresa_id` em `ordem_servico`;
- tabelas `usuario_empresa`, `cargo`, `permissao`, `cargo_permissao`, `usuario_cargo`, `convite_acesso`;
- enums novos de status.

Regras:

- manter `usuario.id_unidade` e `usuario.perfil`;
- permitir colunas novas nulas apenas durante a fase de transição, se necessário;
- criar índices e FKs desde o começo sempre que não bloquearem o backfill.

### 13.4 Fase 2 — backfill

Objetivo: popular o novo modelo a partir dos dados existentes.

Passos:

1. criar uma `Empresa` inicial para o conjunto atual, por exemplo `Matriz` ou nome mais adequado de negócio;
2. vincular toda `UnidadeFabril` existente a essa empresa;
3. copiar `empresa_id` para `Ativo` com base na unidade;
4. copiar `empresa_id` para `OrdemServico` com base no ativo;
5. criar um `UsuarioEmpresa` para cada `Usuario`;
6. transformar cada `perfil` atual em um `Cargo` padrão da empresa;
7. criar `UsuarioCargo` para cada usuário com base em `perfil` + `id_unidade`;
8. popular `Permissao` e `CargoPermissao` para os cargos padrão.

### 13.5 Fase 3 — troca da aplicação

Objetivo: fazer a aplicação ler o novo modelo.

Migrar:

- contexto autenticado para carregar `empresaId`, `slugEmpresa`, cargos e permissões;
- guards para validar empresa e unidade;
- repositórios para sempre filtrar por `empresa_id`;
- casos de uso que hoje dependem de `perfil`;
- bootstrap de usuário para criação de `UsuarioEmpresa` e `UsuarioCargo`, não apenas `Usuario`.

### 13.6 Fase 4 — endurecimento

Objetivo: remover dependências legadas.

Depois que tudo estiver estável:

- tornar `empresa_id` obrigatório nas tabelas operacionais;
- remover o uso de `usuario.perfil` dos fluxos de autorização;
- remover `usuario.id_unidade` se o contexto já vier de `UsuarioCargo`;
- avaliar remover também o enum `PerfilUsuario`.

### 13.7 Ordem sugerida de migrações Prisma

1. `2026xxxxxx_empresa_e_multi_tenant_base`
2. `2026xxxxxx_iam_cargo_permissao`
3. `2026xxxxxx_convite_acesso`
4. `2026xxxxxx_backfill_empresa_usuario_cargo`
5. `2026xxxxxx_hardening_multi_tenant`

### 13.8 Riscos e cuidados

- não substituir `perfil` por `cargo` em um único passo;
- não remover `id_unidade` de `Usuario` antes do backfill completo;
- revisar seeds e testes e2e junto com a migração;
- revisar `EnsureUsuarioLocalUseCase`, pois ele hoje cria apenas `Usuario`;
- revisar filtros de OS e ativos para evitar qualquer vazamento cruzado entre empresas.

### 13.9 Critério de pronto para o corte

O legado só deve ser removido quando:

- toda requisição autenticada resolver `empresaId`;
- toda query operacional filtrar por `empresa_id`;
- os cargos padrão já estiverem populados;
- os testes cobrirem isolamento por empresa e por unidade;
- os fluxos de convite e bootstrap estiverem funcionando.
