ALTER TABLE "ordem_servico"
  ADD COLUMN "criado_por_usuario_id" UUID NULL,
  ADD COLUMN "iniciado_por_usuario_id" UUID NULL,
  ADD COLUMN "finalizado_por_usuario_id" UUID NULL;

CREATE INDEX "ordem_servico_criado_por_usuario_id_idx"
  ON "ordem_servico" ("criado_por_usuario_id");
CREATE INDEX "ordem_servico_iniciado_por_usuario_id_idx"
  ON "ordem_servico" ("iniciado_por_usuario_id");
CREATE INDEX "ordem_servico_finalizado_por_usuario_id_idx"
  ON "ordem_servico" ("finalizado_por_usuario_id");

ALTER TABLE "ordem_servico"
  ADD CONSTRAINT "ordem_servico_criado_por_usuario_id_fkey"
    FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ordem_servico_iniciado_por_usuario_id_fkey"
    FOREIGN KEY ("iniciado_por_usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ordem_servico_finalizado_por_usuario_id_fkey"
    FOREIGN KEY ("finalizado_por_usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ordem_servico_transferencia" (
  "id" UUID PRIMARY KEY,
  "ordem_servico_id" UUID NOT NULL,
  "de_tecnico_id" UUID NULL,
  "para_tecnico_id" UUID NOT NULL,
  "transferido_por_usuario_id" UUID NOT NULL,
  "motivo" VARCHAR(2000) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ordem_servico_transferencia_ordem_servico_id_fkey"
    FOREIGN KEY ("ordem_servico_id") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ordem_servico_transferencia_de_tecnico_id_fkey"
    FOREIGN KEY ("de_tecnico_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ordem_servico_transferencia_para_tecnico_id_fkey"
    FOREIGN KEY ("para_tecnico_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ordem_servico_transferencia_transferido_por_usuario_id_fkey"
    FOREIGN KEY ("transferido_por_usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ordem_servico_transferencia_ordem_servico_id_created_at_idx"
  ON "ordem_servico_transferencia" ("ordem_servico_id", "created_at");
CREATE INDEX "ordem_servico_transferencia_para_tecnico_id_idx"
  ON "ordem_servico_transferencia" ("para_tecnico_id");
CREATE INDEX "ordem_servico_transferencia_transferido_por_usuario_id_idx"
  ON "ordem_servico_transferencia" ("transferido_por_usuario_id");

