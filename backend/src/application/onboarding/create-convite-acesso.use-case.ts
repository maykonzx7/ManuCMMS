import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import {
  AUDIT_LOG_PORT,
  type IAuditLogPort,
} from '../../domain/ports/audit-log.port';
import { EMAIL_PORT, type IEmailPort } from '../../domain/ports/email.port';
import type { PerfilUsuarioCodigo } from '../../domain/ports/usuario-read.port';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import {
  buildInviteEmailTemplate,
  buildInviteLink,
  normalizeDisplayName,
  normalizeEmail,
  normalizePortalPath,
} from './onboarding.shared';

const PERFIS_CONVITE: PerfilUsuarioCodigo[] = [
  'TECNICO',
  'SUPERVISOR',
  'GESTOR',
  'AUDITOR',
  'ADMIN',
];

@Injectable()
export class CreateConviteAcessoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
    @Inject(EMAIL_PORT) private readonly emailPort: IEmailPort,
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
    const cargoCodigo = input.cargoCodigo?.trim().toUpperCase() as PerfilUsuarioCodigo;
    if (!PERFIS_CONVITE.includes(cargoCodigo)) {
      throw new BadRequestException(
        `cargoCodigo invalido; use um de: ${PERFIS_CONVITE.join(', ')}.`,
      );
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
    const token = randomBytes(24).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
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
        ${cargoCodigo},
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
        cargoCodigo,
        idUnidadeDestino,
        expiraEm: expiraEm.toISOString(),
      },
    });

    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const frontendBaseUrl =
      this.config.get<string>('FRONTEND_PUBLIC_BASE_URL')?.trim() ||
      'http://localhost:5173';
    const invitePath = normalizePortalPath(
      this.config.get<string>('FRONTEND_INVITE_PORTAL_PATH'),
      '/convite',
    );
    const inviteLink = buildInviteLink({
      baseUrl: frontendBaseUrl,
      invitePath,
      token,
      emailDestino,
      empresaSlug: empresa.slug,
    });
    const dataExpiracao = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(expiraEm);

    let entregaEmail: { status: 'ENVIADO' | 'NAO_CONFIGURADO' | 'FALHOU'; erro?: string } = {
      status: 'NAO_CONFIGURADO',
    };

    if (this.emailPort.isConfigured()) {
      try {
        const template = buildInviteEmailTemplate({
          nomeDestinatario: nomeDestino,
          nomeEmpresa: empresa.nomeEmpresa,
          linkConvite: inviteLink,
          dataExpiracao,
          cargoCodigo,
          nomeUnidadeDestino: unidadeDestinoNome,
        });
        await this.emailPort.send({
          to: emailDestino,
          subject: template.subject,
          text: template.text,
          html: template.html,
        });
        entregaEmail = { status: 'ENVIADO' };
      } catch (error) {
        entregaEmail = {
          status: 'FALHOU',
          erro:
            error instanceof Error ? error.message : 'Falha ao enviar email de convite.',
        };
      }
    }

    return {
      convite: {
        id: conviteId,
        empresaId,
        emailDestino,
        nomeDestino,
        cargoCodigo,
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
