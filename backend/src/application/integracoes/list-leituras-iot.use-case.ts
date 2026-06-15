import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import {
  ATIVO_REPOSITORY_PORT,
  type IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';

export type LeituraIotHistoricoItem = {
  id: string;
  valor: number;
  limiteTemp: number;
  origem: 'IOT' | 'SIMULACAO';
  consecutivasAcimaLimite: number;
  osPreditivaDisparada: boolean;
  ordemServicoId: string | null;
  ordemServicoRef: string | null;
  correlationId: string | null;
  createdAt: string;
};

@Injectable()
export class ListLeiturasIotUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
  ) {}

  async execute(input: {
    idUnidade: string;
    idAtivo?: string;
    limit?: number;
  }): Promise<{
    idUnidade: string;
    idAtivo: string | null;
    limiteTemp: number | null;
    total: number;
    leituras: LeituraIotHistoricoItem[];
  }> {
    const idUnidade = input.idUnidade?.trim();
    if (!idUnidade) {
      throw new BadRequestException('idUnidade é obrigatório.');
    }

    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }

    const idAtivo = input.idAtivo?.trim() || null;
    let limiteTemp: number | null = null;

    if (idAtivo) {
      const ativo = await this.ativos.findByIdInUnidade(
        unidade.empresaId,
        idUnidade,
        idAtivo,
      );
      if (!ativo) {
        throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
      }
      limiteTemp = ativo.limiteTemp;
    }

    const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);

    const rows = idAtivo
      ? await this.prisma.$queryRaw<
          Array<{
            id: string;
            valor: number;
            limiteTemp: number;
            origem: 'IOT' | 'SIMULACAO';
            consecutivasAcimaLimite: number;
            osPreditivaDisparada: boolean;
            ordemServicoId: string | null;
            correlationId: string | null;
            createdAt: Date;
          }>
        >(Prisma.sql`
          SELECT
            l.id,
            l.valor,
            l.limite_temp AS "limiteTemp",
            l.origem,
            l.consecutivas_acima_limite AS "consecutivasAcimaLimite",
            l.os_preditiva_disparada AS "osPreditivaDisparada",
            l.ordem_servico_id AS "ordemServicoId",
            l.correlation_id AS "correlationId",
            l.created_at AS "createdAt"
          FROM leitura_iot l
          WHERE l.id_unidade = ${idUnidade}::uuid
            AND l.id_ativo = ${idAtivo}::uuid
          ORDER BY l.created_at ASC
          LIMIT ${limit}
        `)
      : await this.prisma.$queryRaw<
          Array<{
            id: string;
            valor: number;
            limiteTemp: number;
            origem: 'IOT' | 'SIMULACAO';
            consecutivasAcimaLimite: number;
            osPreditivaDisparada: boolean;
            ordemServicoId: string | null;
            correlationId: string | null;
            createdAt: Date;
          }>
        >(Prisma.sql`
          SELECT
            l.id,
            l.valor,
            l.limite_temp AS "limiteTemp",
            l.origem,
            l.consecutivas_acima_limite AS "consecutivasAcimaLimite",
            l.os_preditiva_disparada AS "osPreditivaDisparada",
            l.ordem_servico_id AS "ordemServicoId",
            l.correlation_id AS "correlationId",
            l.created_at AS "createdAt"
          FROM leitura_iot l
          WHERE l.id_unidade = ${idUnidade}::uuid
          ORDER BY l.created_at ASC
          LIMIT ${limit}
        `);

    const leituras: LeituraIotHistoricoItem[] = rows.map((row) => ({
      id: row.id,
      valor: row.valor,
      limiteTemp: row.limiteTemp,
      origem: row.origem,
      consecutivasAcimaLimite: row.consecutivasAcimaLimite,
      osPreditivaDisparada: row.osPreditivaDisparada,
      ordemServicoId: row.ordemServicoId,
      ordemServicoRef: row.ordemServicoId
        ? row.ordemServicoId.slice(0, 8).toUpperCase()
        : null,
      correlationId: row.correlationId,
      createdAt: row.createdAt.toISOString(),
    }));

    return {
      idUnidade,
      idAtivo,
      limiteTemp,
      total: leituras.length,
      leituras,
    };
  }
}
