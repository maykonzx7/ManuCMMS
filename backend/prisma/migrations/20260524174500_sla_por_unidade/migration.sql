ALTER TABLE "unidade_fabril"
  ADD COLUMN "sla_corretiva_horas" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "sla_preventiva_horas" INTEGER NOT NULL DEFAULT 168,
  ADD COLUMN "sla_preditiva_horas" INTEGER NOT NULL DEFAULT 72;
