-- CreateEnum
CREATE TYPE "StatusEmpresa" AS ENUM ('ATIVA', 'SUSPENSA', 'INATIVA');

-- CreateEnum
CREATE TYPE "StatusUsuario" AS ENUM ('ATIVO', 'INATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "StatusUsuarioEmpresa" AS ENUM ('ATIVO', 'INATIVO', 'PENDENTE');

-- CreateEnum
CREATE TYPE "StatusUnidadeFabril" AS ENUM ('ATIVA', 'INATIVA');

-- CreateEnum
CREATE TYPE "StatusConviteAcesso" AS ENUM ('PENDENTE', 'ACEITO', 'EXPIRADO', 'CANCELADO');

-- AlterTable
ALTER TABLE "unidade_fabril"
ADD COLUMN "empresa_id" UUID,
ADD COLUMN "status" "StatusUnidadeFabril" NOT NULL DEFAULT 'ATIVA',
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "usuario"
ADD COLUMN "status" "StatusUsuario" NOT NULL DEFAULT 'ATIVO';

-- AlterTable
ALTER TABLE "ativo"
ADD COLUMN "empresa_id" UUID;

-- AlterTable
ALTER TABLE "ordem_servico"
ADD COLUMN "empresa_id" UUID;

-- CreateTable
CREATE TABLE "empresa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome_empresa" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "status" "StatusEmpresa" NOT NULL DEFAULT 'ATIVA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_empresa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "status" "StatusUsuarioEmpresa" NOT NULL DEFAULT 'ATIVO',
    "is_responsavel_principal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" VARCHAR(255),
    "nivel_hierarquico" INTEGER NOT NULL,
    "is_sistema" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" VARCHAR(100) NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "descricao" VARCHAR(255),
    "modulo" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo_permissao" (
    "cargo_id" UUID NOT NULL,
    "permissao_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargo_permissao_pkey" PRIMARY KEY ("cargo_id","permissao_id")
);

-- CreateTable
CREATE TABLE "usuario_cargo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_empresa_id" UUID NOT NULL,
    "cargo_id" UUID NOT NULL,
    "id_unidade" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convite_acesso" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "email_destino" VARCHAR(100) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "status" "StatusConviteAcesso" NOT NULL DEFAULT 'PENDENTE',
    "expira_em" TIMESTAMP(3) NOT NULL,
    "convidado_por_usuario_id" UUID NOT NULL,
    "usuario_criado_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convite_acesso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_slug_key" ON "empresa"("slug");

-- CreateIndex
CREATE INDEX "unidade_fabril_empresa_id_idx" ON "unidade_fabril"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "unidade_fabril_empresa_id_nome_key" ON "unidade_fabril"("empresa_id", "nome");

-- CreateIndex
CREATE INDEX "ativo_empresa_id_id_unidade_idx" ON "ativo"("empresa_id", "id_unidade");

-- CreateIndex
CREATE INDEX "ordem_servico_empresa_id_status_data_abertura_idx" ON "ordem_servico"("empresa_id", "status", "data_abertura");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_empresa_usuario_id_empresa_id_key" ON "usuario_empresa"("usuario_id", "empresa_id");

-- CreateIndex
CREATE INDEX "usuario_empresa_empresa_id_idx" ON "usuario_empresa"("empresa_id");

-- CreateIndex
CREATE UNIQUE INDEX "cargo_empresa_id_codigo_key" ON "cargo"("empresa_id", "codigo");

-- CreateIndex
CREATE INDEX "cargo_empresa_id_nivel_hierarquico_idx" ON "cargo"("empresa_id", "nivel_hierarquico");

-- CreateIndex
CREATE UNIQUE INDEX "permissao_codigo_key" ON "permissao"("codigo");

-- CreateIndex
CREATE INDEX "usuario_cargo_usuario_empresa_id_idx" ON "usuario_cargo"("usuario_empresa_id");

-- CreateIndex
CREATE INDEX "usuario_cargo_cargo_id_idx" ON "usuario_cargo"("cargo_id");

-- CreateIndex
CREATE INDEX "usuario_cargo_id_unidade_idx" ON "usuario_cargo"("id_unidade");

-- CreateIndex
CREATE INDEX "convite_acesso_empresa_id_status_idx" ON "convite_acesso"("empresa_id", "status");

-- CreateIndex
CREATE INDEX "convite_acesso_email_destino_idx" ON "convite_acesso"("email_destino");

-- AddForeignKey
ALTER TABLE "unidade_fabril" ADD CONSTRAINT "unidade_fabril_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ativo" ADD CONSTRAINT "ativo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_empresa" ADD CONSTRAINT "usuario_empresa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_empresa" ADD CONSTRAINT "usuario_empresa_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo" ADD CONSTRAINT "cargo_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_permissao" ADD CONSTRAINT "cargo_permissao_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_permissao" ADD CONSTRAINT "cargo_permissao_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_cargo" ADD CONSTRAINT "usuario_cargo_usuario_empresa_id_fkey" FOREIGN KEY ("usuario_empresa_id") REFERENCES "usuario_empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_cargo" ADD CONSTRAINT "usuario_cargo_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_cargo" ADD CONSTRAINT "usuario_cargo_id_unidade_fkey" FOREIGN KEY ("id_unidade") REFERENCES "unidade_fabril"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_acesso" ADD CONSTRAINT "convite_acesso_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_acesso" ADD CONSTRAINT "convite_acesso_convidado_por_usuario_id_fkey" FOREIGN KEY ("convidado_por_usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_acesso" ADD CONSTRAINT "convite_acesso_usuario_criado_id_fkey" FOREIGN KEY ("usuario_criado_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
