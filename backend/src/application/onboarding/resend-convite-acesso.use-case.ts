import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import { EMAIL_PORT, type IEmailPort } from '../../domain/ports/email.port';
import { EmailDeliveryService } from '../../infrastructure/email/email-delivery.service';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { isPerfilConvite } from './convite-cargo.shared';
import {
  buildInviteAccessLink,
  createInviteToken,
  queueInviteEmail,
  sendInviteEmail,
  type InviteEmailDeliveryStatus,
} from './invite-delivery.shared';

@Injectable()
export class ResendConviteAcessoUseCase {
  private readonly logger = new Logger(ResendConviteAcessoUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(EMAIL_PORT) private readonly emailPort: IEmailPort,
    private readonly emailDelivery: EmailDeliveryService,
  ) {}

  async execute(
    usuarioLocal: UsuarioLocalContext | undefined,
    empresaId: string,
    conviteId: string,
  ) {
    if (!usuarioLocal?.empresa?.id) {
      throw new ForbiddenException(
        'Contexto da empresa autenticada nao esta disponivel.',
      );
    }

    if (usuarioLocal.empresa.id !== empresaId) {
      throw new ForbiddenException(
        'Nao e permitido reenviar convite de outra empresa.',
      );
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        emailDestino: string;
        cargoCodigo: string;
        status: string;
        expiraEm: Date;
        unidadeNome: string | null;
      }>
    >(Prisma.sql`
      SELECT
        ca.id,
        ca.email_destino AS "emailDestino",
        ca.cargo_codigo AS "cargoCodigo",
        ca.status::text AS status,
        ca.expira_em AS "expiraEm",
        uf.nome AS "unidadeNome"
      FROM convite_acesso ca
      LEFT JOIN unidade_fabril uf ON uf.id = ca.id_unidade_destino
      WHERE ca.id = ${conviteId}::uuid
        AND ca.empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);
    const convite = rows[0];
    if (!convite) {
      throw new NotFoundException('Convite nao encontrado.');
    }

    const expiradoPorTempo =
      convite.status === 'PENDENTE' && convite.expiraEm.getTime() < Date.now();
    const podeReenviar =
      convite.status === 'PENDENTE' || expiradoPorTempo;
    if (!podeReenviar) {
      throw new BadRequestException(
        'Somente convites pendentes ou expirados podem ser reenviados.',
      );
    }

    const empresaRows = await this.prisma.$queryRaw<
      Array<{ nomeEmpresa: string; slug: string }>
    >(Prisma.sql`
      SELECT nome_empresa AS "nomeEmpresa", slug
      FROM empresa
      WHERE id = ${empresaId}::uuid
      LIMIT 1
    `);
    const empresa = empresaRows[0];
    if (!empresa) {
      throw new NotFoundException('Empresa nao encontrada.');
    }

    let cargoExibicao = convite.cargoCodigo;
    if (!isPerfilConvite(convite.cargoCodigo)) {
      const cargoRows = await this.prisma.$queryRaw<
        Array<{ nome: string }>
      >(Prisma.sql`
        SELECT nome
        FROM cargo
        WHERE empresa_id = ${empresaId}::uuid
          AND codigo = ${convite.cargoCodigo}
        LIMIT 1
      `);
      cargoExibicao = cargoRows[0]?.nome ?? convite.cargoCodigo;
    }

    const { token, tokenHash } = createInviteToken();
    const expiraEm = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2);

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE convite_acesso
      SET
        token_hash = ${tokenHash},
        status = 'PENDENTE',
        expira_em = ${expiraEm},
        updated_at = NOW()
      WHERE id = ${conviteId}::uuid
    `);

    const inviteLink = buildInviteAccessLink(this.config, {
      emailDestino: convite.emailDestino,
      empresaSlug: empresa.slug,
      token,
    });
    const emailPayload = {
      emailDestino: convite.emailDestino,
      nomeDestino: convite.emailDestino.split('@')[0] || 'Colaborador',
      nomeEmpresa: empresa.nomeEmpresa,
      empresaSlug: empresa.slug,
      token,
      expiraEm,
      conviteCargoCodigo: convite.cargoCodigo,
      cargoExibicao,
      unidadeDestinoNome: convite.unidadeNome,
    };

    let entregaEmail: InviteEmailDeliveryStatus = 'NAO_CONFIGURADO';
    if (this.emailPort.isConfigured()) {
      if (this.emailDelivery.activeTransport() === 'brevo-api') {
        entregaEmail = await sendInviteEmail(
          this.emailPort,
          emailPayload,
          inviteLink,
        );
      } else {
        queueInviteEmail(this.emailPort, this.logger, emailPayload, inviteLink);
        entregaEmail = 'ENVIANDO';
      }
    }

    return {
      convite: {
        id: conviteId,
        emailDestino: convite.emailDestino,
        expiraEm: expiraEm.toISOString(),
        status: 'PENDENTE' as const,
      },
      links: {
        convite: inviteLink,
      },
      entregaEmail,
    };
  }
}
