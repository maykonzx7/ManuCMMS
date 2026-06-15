CREATE TYPE "OrigemLeituraIot" AS ENUM ('IOT', 'SIMULACAO');

CREATE TABLE "leitura_iot" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "id_unidade" UUID NOT NULL,
  "id_ativo" UUID NOT NULL,
  "valor" DOUBLE PRECISION NOT NULL,
  "limite_temp" DOUBLE PRECISION NOT NULL,
  "origem" "OrigemLeituraIot" NOT NULL,
  "consecutivas_acima_limite" INTEGER NOT NULL DEFAULT 0,
  "os_preditiva_disparada" BOOLEAN NOT NULL DEFAULT false,
  "ordem_servico_id" UUID,
  "correlation_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "leitura_iot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leitura_iot_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "leitura_iot_id_unidade_fkey" FOREIGN KEY ("id_unidade") REFERENCES "unidade_fabril"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "leitura_iot_id_ativo_fkey" FOREIGN KEY ("id_ativo") REFERENCES "ativo"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "leitura_iot_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordem_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "leitura_iot_id_ativo_created_at_idx" ON "leitura_iot"("id_ativo", "created_at" DESC);
CREATE INDEX "leitura_iot_id_unidade_created_at_idx" ON "leitura_iot"("id_unidade", "created_at" DESC);
CREATE INDEX "leitura_iot_correlation_id_idx" ON "leitura_iot"("correlation_id");
