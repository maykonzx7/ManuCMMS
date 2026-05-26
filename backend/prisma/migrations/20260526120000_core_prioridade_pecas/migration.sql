-- Prioridade de OS + estoque de peças (RN-07)

CREATE TYPE "PrioridadeOrdemServico" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

ALTER TABLE "ordem_servico"
ADD COLUMN "prioridade" "PrioridadeOrdemServico" NOT NULL DEFAULT 'MEDIA';

CREATE TABLE "peca" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "id_unidade" UUID NOT NULL,
    "codigo" VARCHAR(80) NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "quantidade_estoque" INTEGER NOT NULL DEFAULT 0,
    "quantidade_minima" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peca_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "peca_empresa_id_unidade_codigo_key"
ON "peca"("empresa_id", "id_unidade", "codigo");

CREATE INDEX "peca_empresa_id_id_unidade_idx"
ON "peca"("empresa_id", "id_unidade");

ALTER TABLE "peca"
ADD CONSTRAINT "peca_empresa_id_fkey"
FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "peca"
ADD CONSTRAINT "peca_id_unidade_fkey"
FOREIGN KEY ("id_unidade") REFERENCES "unidade_fabril"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ordem_servico_peca" (
    "id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "peca_id" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordem_servico_peca_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ordem_servico_peca_ordem_servico_id_peca_id_key"
ON "ordem_servico_peca"("ordem_servico_id", "peca_id");

CREATE INDEX "ordem_servico_peca_peca_id_idx"
ON "ordem_servico_peca"("peca_id");

ALTER TABLE "ordem_servico_peca"
ADD CONSTRAINT "ordem_servico_peca_ordem_servico_id_fkey"
FOREIGN KEY ("ordem_servico_id") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ordem_servico_peca"
ADD CONSTRAINT "ordem_servico_peca_peca_id_fkey"
FOREIGN KEY ("peca_id") REFERENCES "peca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
