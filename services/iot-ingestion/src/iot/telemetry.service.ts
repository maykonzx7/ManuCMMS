import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../infrastructure/prisma.service';
import { EventPublisherService } from './event-publisher.service';
import { RedisCounterService } from './redis-counter.service';

type AtivoRow = {
  id: string;
  idUnidade: string;
  empresaId: string;
  nome: string;
  limiteTemp: number;
};

@Injectable()
export class TelemetryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisCounter: RedisCounterService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async ingest(input: {
    ativoId: string;
    valor: number;
    origem: 'IOT' | 'SIMULACAO';
  }) {
    if (!input.ativoId?.trim()) {
      throw new BadRequestException('ativoId obrigatório.');
    }

    if (!Number.isFinite(input.valor)) {
      throw new BadRequestException('valor inválido.');
    }

    const ativo = await this.findAtivo(input.ativoId);
    if (!ativo) {
      throw new NotFoundException('Ativo não encontrado.');
    }

    const correlationId = randomUUID();
    const { consecutive, triggered } = await this.redisCounter.registerReading(
      ativo.id,
      input.valor,
      ativo.limiteTemp,
    );

    let osPreditivaPublicada = false;

    if (triggered) {
      await this.eventPublisher.publishOSPreditiva({
        ativoId: ativo.id,
        idUnidade: ativo.idUnidade,
        empresaId: ativo.empresaId,
        valorLeitura: input.valor,
        limiteTemp: ativo.limiteTemp,
        motivo: `RN-01: ${consecutive} leituras consecutivas acima do limite térmico.`,
        origem: input.origem,
        correlationId,
      });
      await this.redisCounter.reset(ativo.id);
      osPreditivaPublicada = true;
    }

    return {
      ativoId: ativo.id,
      ativoNome: ativo.nome,
      valor: input.valor,
      limiteTemp: ativo.limiteTemp,
      leiturasConsecutivasAcimaLimite: consecutive,
      osPreditivaPublicada,
      correlationId,
    };
  }

  private async findAtivo(ativoId: string): Promise<AtivoRow | null> {
    const rows = await this.prisma.$queryRaw<AtivoRow[]>(Prisma.sql`
      SELECT
        id,
        id_unidade AS "idUnidade",
        empresa_id AS "empresaId",
        nome,
        limite_temp AS "limiteTemp"
      FROM ativo
      WHERE id = ${ativoId}::uuid
      LIMIT 1
    `);
    return rows[0] ?? null;
  }
}
