-- Fila do técnico: OS atribuída aguarda enquanto outra está em execução
ALTER TYPE "StatusOrdemServico" ADD VALUE IF NOT EXISTS 'AGUARDANDO';

ALTER TABLE ordem_servico
  ADD COLUMN IF NOT EXISTS data_prazo_vencimento TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_limite_atraso TIMESTAMPTZ;
