-- CreateEnum
CREATE TYPE "TipoOrdemServico" AS ENUM ('CORRETIVA', 'PREVENTIVA', 'PREDITIVA');

-- CreateEnum
CREATE TYPE "StatusOrdemServico" AS ENUM ('ABERTA', 'EM_EXECUCAO', 'CONCLUIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "ordem_servico" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "id_ativo" UUID NOT NULL,
    "id_tecnico" UUID,
    "tipo" "TipoOrdemServico" NOT NULL,
    "status" "StatusOrdemServico" NOT NULL DEFAULT 'ABERTA',
    "descricao" TEXT NOT NULL,
    "foto_anexo" VARCHAR(2048),
    "assinatura_digital" TEXT,
    "data_abertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_fechamento" TIMESTAMP(3),

    CONSTRAINT "ordem_servico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ordem_servico_id_ativo_idx" ON "ordem_servico"("id_ativo");

-- CreateIndex
CREATE INDEX "ordem_servico_id_tecnico_idx" ON "ordem_servico"("id_tecnico");

-- AddForeignKey
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_id_ativo_fkey" FOREIGN KEY ("id_ativo") REFERENCES "ativo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordem_servico" ADD CONSTRAINT "ordem_servico_id_tecnico_fkey" FOREIGN KEY ("id_tecnico") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
