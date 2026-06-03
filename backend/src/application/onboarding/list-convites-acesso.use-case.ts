import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';

type ConviteStatusDb =
  | 'PENDENTE'
  | 'ACEITO'
  | 'EXPIRADO'
  | 'CANCELADO';

@Injectable()
export class ListConvitesAcessoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(usuarioLocal: UsuarioLocalContext | undefined, empresaId: string) {
    if (!usuarioLocal?.empresa?.id) {
      throw new ForbiddenException(
        'Contexto da empresa autenticada nao esta disponivel.',
      );
    }

    if (usuarioLocal.empresa.id !== empresaId) {
      throw new ForbiddenException(
        'Nao e permitido consultar convites de outra empresa.',
      );
    }

    const empresaRows = await this.prisma.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id
        FROM empresa
        WHERE id = ${empresaId}::uuid
        LIMIT 1
      `,
    );
    if (!empresaRows[0]?.id) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        emailDestino: string;
        cargoCodigo: string;
        status: ConviteStatusDb;
        expiraEm: Date;
        createdAt: Date;
        unidadeNome: string | null;
        convidadoPorNome: string | null;
      }>
    >(Prisma.sql`
      SELECT
        ca.id,
        ca.email_destino AS "emailDestino",
        ca.cargo_codigo AS "cargoCodigo",
        ca.status::text AS status,
        ca.expira_em AS "expiraEm",
        ca.created_at AS "createdAt",
        uf.nome AS "unidadeNome",
        u.nome AS "convidadoPorNome"
      FROM convite_acesso ca
      LEFT JOIN unidade_fabril uf ON uf.id = ca.id_unidade_destino
      LEFT JOIN usuario u ON u.id = ca.convidado_por_usuario_id
      WHERE ca.empresa_id = ${empresaId}::uuid
      ORDER BY ca.created_at DESC
    `);

    const now = Date.now();

    return {
      convites: rows.map((row) => {
        const expiradoPorTempo =
          row.status === 'PENDENTE' && row.expiraEm.getTime() < now;
        const situacao: ConviteStatusDb = expiradoPorTempo
          ? 'EXPIRADO'
          : row.status;

        return {
          id: row.id,
          emailDestino: row.emailDestino,
          cargoCodigo: row.cargoCodigo,
          status: row.status,
          situacao,
          expiraEm: row.expiraEm.toISOString(),
          createdAt: row.createdAt.toISOString(),
          unidadeNome: row.unidadeNome,
          convidadoPorNome: row.convidadoPorNome,
          podeCancelar: situacao === 'PENDENTE',
          podeReenviar: situacao === 'PENDENTE' || situacao === 'EXPIRADO',
        };
      }),
    };
  }
}
