ALTER TABLE "usuario"
ADD COLUMN "credencial" VARCHAR(60);

CREATE UNIQUE INDEX "usuario_credencial_key"
ON "usuario"("credencial");
