CREATE TYPE "StatusSlaOrdemServico" AS ENUM ('NO_PRAZO', 'ATRASADA', 'CONCLUIDA');

ALTER TABLE "ordem_servico"
  ADD COLUMN "descricao_problema" VARCHAR(4000),
  ADD COLUMN "data_limite_sla" TIMESTAMPTZ,
  ADD COLUMN "status_sla" "StatusSlaOrdemServico" NOT NULL DEFAULT 'NO_PRAZO',
  ADD COLUMN "sla_atraso_notificado_em" TIMESTAMPTZ;

CREATE INDEX "ordem_servico_data_limite_sla_idx"
  ON "ordem_servico" ("data_limite_sla");

CREATE INDEX "ordem_servico_status_sla_idx"
  ON "ordem_servico" ("status_sla");
