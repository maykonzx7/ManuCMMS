-- Localização do ativo (texto + coordenadas para mapa)
ALTER TABLE "ativo" ADD COLUMN "localizacao" VARCHAR(255);
ALTER TABLE "ativo" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "ativo" ADD COLUMN "longitude" DOUBLE PRECISION;

-- Documentação do ativo (manual, diagrama, documentação)
CREATE TYPE "TipoAtivoDocumento" AS ENUM ('MANUAL', 'DIAGRAMA', 'DOCUMENTACAO');

CREATE TABLE "ativo_documento" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "ativo_id" UUID NOT NULL,
    "tipo" "TipoAtivoDocumento" NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "uploaded_por_usuario_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ativo_documento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ativo_documento_ativo_id_tipo_idx" ON "ativo_documento"("ativo_id", "tipo");
CREATE INDEX "ativo_documento_empresa_id_ativo_id_idx" ON "ativo_documento"("empresa_id", "ativo_id");

ALTER TABLE "ativo_documento" ADD CONSTRAINT "ativo_documento_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ativo_documento" ADD CONSTRAINT "ativo_documento_ativo_id_fkey" FOREIGN KEY ("ativo_id") REFERENCES "ativo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Anexos adicionais da ordem de serviço (problema, resolução, geral)
CREATE TYPE "CategoriaOrdemServicoAnexo" AS ENUM ('PROBLEMA', 'RESOLUCAO', 'GERAL');

CREATE TABLE "ordem_servico_anexo" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "ordem_servico_id" UUID NOT NULL,
    "categoria" "CategoriaOrdemServicoAnexo" NOT NULL,
    "nome" VARCHAR(200) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "uploaded_por_usuario_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordem_servico_anexo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ordem_servico_anexo_ordem_servico_id_categoria_idx" ON "ordem_servico_anexo"("ordem_servico_id", "categoria");
CREATE INDEX "ordem_servico_anexo_empresa_id_ordem_servico_id_idx" ON "ordem_servico_anexo"("empresa_id", "ordem_servico_id");

ALTER TABLE "ordem_servico_anexo" ADD CONSTRAINT "ordem_servico_anexo_ordem_servico_id_fkey" FOREIGN KEY ("ordem_servico_id") REFERENCES "ordem_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
