import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import {
  AUDIT_LOG_PORT,
  type IAuditLogPort,
} from '../../domain/ports/audit-log.port';
import { EMAIL_PORT, type IEmailPort } from '../../domain/ports/email.port';
import { EmailDeliveryService } from '../../infrastructure/email/email-delivery.service';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import {
  isPerfilConvite,
  PERFIS_CONVITE,
  resolvePerfilFromCargo,
} from './convite-cargo.shared';
import {
  buildInviteAccessLink,
  createInviteToken,
  queueInviteEmail,
  sendInviteEmail,
  type InviteEmailDeliveryStatus,
} from './invite-delivery.shared';
import {
  normalizeDisplayName,
  normalizeEmail,
} from './onboarding.shared';

@Injectable()
export class CreateConviteAcessoUseCase {
  private readonly logger = new Logger(CreateConviteAcessoUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
    @Inject(EMAIL_PORT) private readonly emailPort: IEmailPort,
    private readonly emailDelivery: EmailDeliveryService,
  ) {}

  async execute(
    usuarioLocal: UsuarioLocalContext | undefined,
    empresaId: string,
    input: {
      emailDestino: string;
      nomeDestino?: string;
      cargoCodigo: string;
      idUnidadeDestino?: string | null;
    },
  ) {
    if (!usuarioLocal?.empresa?.id) {
      throw new ForbiddenException(
        'Contexto da empresa autenticada nao esta disponivel.',
      );
    }

    if (usuarioLocal.empresa.id !== empresaId) {
      throw new ForbiddenException(
        'Nao e permitido criar convite para outra empresa.',
      );
    }

    const emailDestino = normalizeEmail(input.emailDestino);
    if (!emailDestino || emailDestino.length > 100) {
      throw new BadRequestException(
        'emailDestino e obrigatorio e deve ter ate 100 caracteres.',
      );
    }
    const nomeDestino = normalizeDisplayName(
      input.nomeDestino,
      emailDestino.split('@')[0] || 'Colaborador',
    );
    const cargoCodigo = input.cargoCodigo?.trim().toUpperCase() ?? '';
    if (!cargoCodigo) {
      throw new BadRequestException('cargoCodigo e obrigatorio.');
    }

    let cargoExibicao = cargoCodigo;
    let conviteCargoCodigo = cargoCodigo;

    if (!isPerfilConvite(cargoCodigo)) {
      const empresaCargoRows = await this.prisma.$queryRaw<
        Array<{
          codigo: string;
          nome: string;
          nivelHierarquico: number;
        }>
      >(
        Prisma.sql`
          SELECT
            codigo,
            nome,
            nivel_hierarquico AS "nivelHierarquico"
          FROM cargo
          WHERE empresa_id = ${empresaId}::uuid
            AND codigo = ${cargoCodigo}
          LIMIT 1
        `,
      );
      const empresaCargo = empresaCargoRows[0];
      if (!empresaCargo) {
        throw new BadRequestException(
          `cargoCodigo invalido; use um perfil (${PERFIS_CONVITE.join(', ')}) ou um codigo de cargo cadastrado na empresa.`,
        );
      }

      resolvePerfilFromCargo(cargoCodigo, empresaCargo);
      conviteCargoCodigo = empresaCargo.codigo;
      cargoExibicao = empresaCargo.nome;
    }
    const idUnidadeDestino = input.idUnidadeDestino?.trim() || null;

    const empresaRows = await this.prisma.$queryRaw<
      Array<{ id: string; nomeEmpresa: string; slug: string }>
    >(
      Prisma.sql`
        SELECT id, nome_empresa AS "nomeEmpresa", slug
        FROM empresa
        WHERE id = ${empresaId}::uuid
        LIMIT 1
      `,
    );
    const empresa = empresaRows[0];
    if (!empresa?.id) {
      throw new NotFoundException('Empresa nao encontrada.');
    }
    let unidadeDestinoNome: string | null = null;
    if (idUnidadeDestino) {
      const unidadeRows = await this.prisma.$queryRaw<
        Array<{ id: string; nome: string }>
      >(
        Prisma.sql`
          SELECT id, nome
          FROM unidade_fabril
          WHERE id = ${idUnidadeDestino}::uuid
            AND empresa_id = ${empresaId}::uuid
          LIMIT 1
        `,
      );
      if (!unidadeRows[0]?.id) {
        throw new NotFoundException(
          'Unidade de destino nao encontrada nesta empresa.',
        );
      }
      unidadeDestinoNome = unidadeRows[0].nome;
    }

    const conviteId = randomUUID();
    const { token, tokenHash } = createInviteToken();
    const expiraEm = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2);

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO convite_acesso (
        id,
        empresa_id,
        email_destino,
        cargo_codigo,
        id_unidade_destino,
        token_hash,
        status,
        expira_em,
        convidado_por_usuario_id,
        usuario_criado_id,
        created_at,
        updated_at
      )
      VALUES (
        ${conviteId}::uuid,
        ${empresaId}::uuid,
        ${emailDestino},
        ${conviteCargoCodigo},
        ${idUnidadeDestino}::uuid,
        ${tokenHash},
        'PENDENTE',
        ${expiraEm},
        ${usuarioLocal.id}::uuid,
        NULL,
        NOW(),
        NOW()
      )
    `);

    await this.auditLog.append({
      idUsuario: usuarioLocal.id,
      entidadeAfetada: 'ConviteAcesso',
      idRegistro: conviteId,
      valorAnterior: {},
      valorNovo: {
        empresaId,
        emailDestino,
        nomeDestino,
        cargoCodigo: conviteCargoCodigo,
        idUnidadeDestino,
        expiraEm: expiraEm.toISOString(),
      },
    });

    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const inviteLink = buildInviteAccessLink(this.config, {
      emailDestino,
      empresaSlug: empresa.slug,
      token,
    });
    const emailPayload = {
      emailDestino,
      nomeDestino,
      nomeEmpresa: empresa.nomeEmpresa,
      empresaSlug: empresa.slug,
      token,
      expiraEm,
      conviteCargoCodigo,
      cargoExibicao,
      unidadeDestinoNome,
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
        empresaId,
        emailDestino,
        nomeDestino,
        cargoCodigo: conviteCargoCodigo,
        idUnidadeDestino,
        expiraEm: expiraEm.toISOString(),
        token: isProd ? undefined : token,
      },
      entregaEmail,
      links: {
        convite: inviteLink,
      },
    };
  }
}
