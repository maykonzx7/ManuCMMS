import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { CriarOSPreditivaEvent } from '../shared/contracts';
import { PrismaService } from '../infrastructure/prisma.service';

@Injectable()
export class OsPreditivaService {
  private readonly logger = new Logger(OsPreditivaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createFromEvent(event: CriarOSPreditivaEvent): Promise<string | null> {
    const openRows = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT os.id
        FROM ordem_servico os
        INNER JOIN ativo a ON a.id = os.id_ativo
        WHERE os.id_ativo = ${event.ativoId}::uuid
          AND os.empresa_id = ${event.empresaId}::uuid
          AND a.id_unidade = ${event.idUnidade}::uuid
          AND os.tipo = 'PREDITIVA'
          AND os.status IN ('ABERTA', 'EM_EXECUCAO')
        LIMIT 1
      `,
    );

    if (openRows[0]) {
      this.logger.log(
        `OS preditiva já aberta para ativo ${event.ativoId}; ignorando evento.`,
      );
      return null;
    }

    const id = randomUUID();
    const descricao = [
      `OS preditiva gerada automaticamente (${event.origem}).`,
      event.motivo,
      `Leitura: ${event.valorLeitura}°C (limite ${event.limiteTemp}°C).`,
    ].join(' ');

    const slaHours = 72;
    const dataLimiteSla = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO ordem_servico (
          id,
          empresa_id,
          id_ativo,
          tipo,
          prioridade,
          status,
          descricao,
          data_limite_sla,
          status_sla,
          data_abertura
        )
        VALUES (
          ${id}::uuid,
          ${event.empresaId}::uuid,
          ${event.ativoId}::uuid,
          'PREDITIVA'::"TipoOrdemServico",
          'ALTA'::"PrioridadeOrdemServico",
          'ABERTA',
          ${descricao},
          ${dataLimiteSla},
          'NO_PRAZO',
          NOW()
        )
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE ativo
        SET
          status = 'MANUTENCAO',
          updated_at = NOW()
        WHERE id = ${event.ativoId}::uuid
          AND empresa_id = ${event.empresaId}::uuid
          AND id_unidade = ${event.idUnidade}::uuid
      `);
    });

    this.logger.log(`OS preditiva ${id} criada para ativo ${event.ativoId}`);
    return id;
  }
}
