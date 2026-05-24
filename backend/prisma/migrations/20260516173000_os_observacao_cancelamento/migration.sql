ALTER TABLE "ordem_servico"
ADD COLUMN IF NOT EXISTS "observacao_cancelamento" VARCHAR(1000);
