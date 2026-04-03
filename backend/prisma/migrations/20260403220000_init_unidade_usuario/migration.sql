-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN');

-- CreateTable
CREATE TABLE "unidade_fabril" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(100) NOT NULL,
    "localizacao" VARCHAR(255) NOT NULL,

    CONSTRAINT "unidade_fabril_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "auth_sub" TEXT NOT NULL,
    "id_unidade" UUID NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "perfil" "PerfilUsuario" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_auth_sub_key" ON "usuario"("auth_sub");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_id_unidade_fkey" FOREIGN KEY ("id_unidade") REFERENCES "unidade_fabril"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
