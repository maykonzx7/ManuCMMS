-- Comentários em ordens de serviço
CREATE TABLE "ordem_servico_comentario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ordem_servico_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "texto" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordem_servico_comentario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ordem_servico_comentario_ordem_servico_id_created_at_idx"
    ON "ordem_servico_comentario"("ordem_servico_id", "created_at");

ALTER TABLE "ordem_servico_comentario"
    ADD CONSTRAINT "ordem_servico_comentario_ordem_servico_id_fkey"
    FOREIGN KEY ("ordem_servico_id") REFERENCES "ordem_servico"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ordem_servico_comentario"
    ADD CONSTRAINT "ordem_servico_comentario_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
