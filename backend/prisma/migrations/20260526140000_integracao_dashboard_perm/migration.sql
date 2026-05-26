-- Permissão dashboard.executivo + campos de integração

INSERT INTO permissao (id, codigo, nome, descricao, modulo, created_at)
SELECT gen_random_uuid(), 'dashboard.executivo', 'Dashboard executivo', 'Visualizar KPIs executivos da unidade.', 'dashboard', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM permissao WHERE codigo = 'dashboard.executivo'
);

INSERT INTO cargo_permissao (cargo_id, permissao_id, created_at)
SELECT c.id, p.id, NOW()
FROM cargo c
JOIN permissao p ON p.codigo = 'dashboard.executivo'
WHERE c.codigo IN ('GESTOR', 'ADMIN')
  AND NOT EXISTS (
    SELECT 1
    FROM cargo_permissao cp
    WHERE cp.cargo_id = c.id AND cp.permissao_id = p.id
  );

ALTER TABLE "empresa"
ADD COLUMN IF NOT EXISTS "webhook_url" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "api_key_integracao" VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS "empresa_api_key_integracao_key"
ON "empresa"("api_key_integracao")
WHERE "api_key_integracao" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "integracao_evento" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "id_unidade" UUID,
    "tipo" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimo_erro" VARCHAR(500),
    "entregue_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "integracao_evento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "integracao_evento_empresa_id_created_at_idx"
ON "integracao_evento"("empresa_id", "created_at" DESC);

ALTER TABLE "integracao_evento"
DROP CONSTRAINT IF EXISTS "integracao_evento_empresa_id_fkey";

ALTER TABLE "integracao_evento"
ADD CONSTRAINT "integracao_evento_empresa_id_fkey"
FOREIGN KEY ("empresa_id") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
