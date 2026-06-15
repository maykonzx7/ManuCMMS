import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { CriarOSPreditivaEvent } from '../shared/contracts';
import { PrismaService } from '../infrastructure/prisma.service';
import { EventPublisherService } from '../infrastructure/event-publisher.service';

@Injectable()
export class OsPreditivaService {
  private readonly logger = new Logger(OsPreditivaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

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
          AND os.status IN ('ABERTA', 'AGUARDANDO', 'EM_EXECUCAO')
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

    const atribuicao = await this.resolveTecnicoAtribuicao(
      event.empresaId,
      event.idUnidade,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO ordem_servico (
          id,
          empresa_id,
          id_ativo,
          id_tecnico,
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
          ${atribuicao.idTecnico}::uuid,
          'PREDITIVA'::"TipoOrdemServico",
          'ALTA'::"PrioridadeOrdemServico",
          ${atribuicao.status}::"StatusOrdemServico",
          ${descricao},
          ${dataLimiteSla},
          'NO_PRAZO'::"StatusSlaOrdemServico",
          NOW()
        )
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE ativo
        SET
          status = 'MANUTENCAO'::"StatusAtivo",
          updated_at = NOW()
        WHERE id = ${event.ativoId}::uuid
          AND empresa_id = ${event.empresaId}::uuid
          AND id_unidade = ${event.idUnidade}::uuid
      `);
    });

    const ativoRows = await this.prisma.$queryRaw<Array<{ nome: string }>>(
      Prisma.sql`
        SELECT nome
        FROM ativo
        WHERE id = ${event.ativoId}::uuid
          AND empresa_id = ${event.empresaId}::uuid
        LIMIT 1
      `,
    );
    const ativoNome = ativoRows[0]?.nome ?? event.ativoId;

    const published = await this.eventPublisher.publishOsPreditivaCriada({
      osId: id,
      ativoId: event.ativoId,
      ativoNome,
      idUnidade: event.idUnidade,
      empresaId: event.empresaId,
      idTecnico: atribuicao.idTecnico,
      status: atribuicao.status,
      origem: event.origem,
      correlationId: event.correlationId,
    });
    if (!published) {
      this.logger.warn(
        `OS preditiva ${id} criada, mas evento de notificação não publicado (RabbitMQ indisponível).`,
      );
    }

    this.logger.log(
      `OS preditiva ${id} criada para ativo ${event.ativoId}` +
        (atribuicao.idTecnico
          ? ` (técnico ${atribuicao.idTecnico}, status ${atribuicao.status})`
          : ' (sem técnico disponível)'),
    );
    return id;
  }

  private async resolveTecnicoAtribuicao(
    empresaId: string,
    idUnidade: string,
  ): Promise<{
    idTecnico: string | null;
    status: 'ABERTA' | 'AGUARDANDO';
  }> {
    const tecnicos = await this.prisma.$queryRaw<
      Array<{ id: string; emExecucao: bigint }>
    >(
      Prisma.sql`
        SELECT
          u.id,
          COUNT(os_exec.id)::bigint AS "emExecucao"
        FROM usuario u
        JOIN unidade_fabril uf ON uf.id = ${idUnidade}::uuid
        JOIN usuario_empresa ue ON ue.usuario_id = u.id
          AND ue.empresa_id = uf.empresa_id
          AND ue.status = 'ATIVO'
        LEFT JOIN usuario_cargo uc ON uc.usuario_empresa_id = ue.id
          AND uc.id_unidade = ${idUnidade}::uuid
        LEFT JOIN ordem_servico os_exec ON os_exec.id_tecnico = u.id
          AND os_exec.empresa_id = ${empresaId}::uuid
          AND os_exec.status = 'EM_EXECUCAO'
          AND EXISTS (
            SELECT 1
            FROM ativo a
            WHERE a.id = os_exec.id_ativo
              AND a.id_unidade = ${idUnidade}::uuid
          )
        WHERE u.perfil = 'TECNICO'
          AND u.status = 'ATIVO'
          AND (
            u.id_unidade = ${idUnidade}::uuid
            OR uc.id IS NOT NULL
          )
        GROUP BY u.id, u.nome
        ORDER BY "emExecucao" ASC, u.nome ASC
        LIMIT 1
      `,
    );

    const tecnico = tecnicos[0];
    if (!tecnico) {
      return { idTecnico: null, status: 'ABERTA' };
    }

    const ocupado = Number(tecnico.emExecucao) > 0;
    return {
      idTecnico: tecnico.id,
      status: ocupado ? 'AGUARDANDO' : 'ABERTA',
    };
  }
}
