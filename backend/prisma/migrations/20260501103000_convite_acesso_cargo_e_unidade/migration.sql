ALTER TABLE "convite_acesso"
ADD COLUMN "cargo_codigo" VARCHAR(80),
ADD COLUMN "id_unidade_destino" UUID;

UPDATE "convite_acesso"
SET "cargo_codigo" = 'TECNICO'
WHERE "cargo_codigo" IS NULL;

ALTER TABLE "convite_acesso"
ALTER COLUMN "cargo_codigo" SET NOT NULL;
