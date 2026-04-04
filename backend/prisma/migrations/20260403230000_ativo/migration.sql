-- CreateEnum
CREATE TYPE "StatusAtivo" AS ENUM ('OPERACIONAL', 'MANUTENCAO', 'FALHA');

-- CreateTable
CREATE TABLE "ativo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_unidade" UUID NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "status" "StatusAtivo" NOT NULL DEFAULT 'OPERACIONAL',
    "limite_temp" DOUBLE PRECISION NOT NULL DEFAULT 48,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ativo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ativo_id_unidade_idx" ON "ativo"("id_unidade");

-- AddForeignKey
ALTER TABLE "ativo" ADD CONSTRAINT "ativo_id_unidade_fkey" FOREIGN KEY ("id_unidade") REFERENCES "unidade_fabril"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
