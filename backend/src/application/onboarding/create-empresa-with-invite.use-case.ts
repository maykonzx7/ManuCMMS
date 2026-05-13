import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import {
  AUDIT_LOG_PORT,
  type IAuditLogPort,
} from '../../domain/ports/audit-log.port';
import { EMAIL_PORT, type IEmailPort } from '../../domain/ports/email.port';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import {
  buildInviteEmailTemplate,
  buildInviteLink,
  buildCompanySlug,
  normalizeCompanyName,
  normalizeDisplayName,
  normalizeEmail,
  normalizePortalPath,
  resolveInviteFrontendBaseUrl,
} from './onboarding.shared';

type CreateEmpresaInput = {
  nomeEmpresa: string;
  slug?: string;
  emailResponsavel: string;
  nomeResponsavel?: string;
  nomeUnidadeInicial?: string;
  localizacaoUnidadeInicial?: string;
};

@Injectable()
export class CreateEmpresaWithInviteUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
    @Inject(EMAIL_PORT) private readonly emailPort: IEmailPort,
  ) {}

  async execute(input: CreateEmpresaInput) {
    const nomeEmpresa = normalizeCompanyName(input.nomeEmpresa);
    if (nomeEmpresa.length < 3 || nomeEmpresa.length > 150) {
      throw new BadRequestException(
        'nomeEmpresa e obrigatorio e deve ter entre 3 e 150 caracteres.',
      );
    }

    const slug = buildCompanySlug(input.slug, nomeEmpresa);
    const emailResponsavel = normalizeEmail(input.emailResponsavel);
    if (!emailResponsavel || emailResponsavel.length > 100) {
      throw new BadRequestException(
        'emailResponsavel e obrigatorio e deve ter ate 100 caracteres.',
      );
    }

    const nomeResponsavel = normalizeDisplayName(
      input.nomeResponsavel,
      emailResponsavel.split('@')[0] || 'Administrador',
    );
    const nomeUnidadeInicial = normalizeDisplayName(
      input.nomeUnidadeInicial,
      'Matriz',
    );
    const localizacaoUnidadeInicial = normalizeDisplayName(
      input.localizacaoUnidadeInicial,
      `${nomeEmpresa} (onboarding)`,
    );

    const inviteToken = randomBytes(24).toString('hex');
    const inviteHash = createHash('sha256').update(inviteToken).digest('hex');
    const empresaId = randomUUID();
    const unidadeId = randomUUID();
    const conviteId = randomUUID();
    const expiraEm = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO empresa (
            id,
            nome_empresa,
            slug,
            status,
            created_at,
            updated_at
          )
          VALUES (
            ${empresaId}::uuid,
            ${nomeEmpresa},
            ${slug},
            'ATIVA',
            NOW(),
            NOW()
          )
        `);

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO unidade_fabril (
            id,
            empresa_id,
            nome,
            localizacao,
            status,
            created_at,
            updated_at
          )
          VALUES (
            ${unidadeId}::uuid,
            ${empresaId}::uuid,
            ${nomeUnidadeInicial},
            ${localizacaoUnidadeInicial},
            'ATIVA',
            NOW(),
            NOW()
          )
        `);

        await tx.$executeRaw(Prisma.sql`
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
            ${emailResponsavel},
            ${'ADMIN'},
            NULL,
            ${inviteHash},
            'PENDENTE',
            ${expiraEm},
            NULL,
            NULL,
            NOW(),
            NOW()
          )
        `);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ja existe empresa cadastrada com este slug.',
        );
      }
      throw error;
    }

    await this.auditLog.append({
      idUsuario: null,
      entidadeAfetada: 'Empresa',
      idRegistro: empresaId,
      valorAnterior: {},
      valorNovo: {
        nomeEmpresa,
        slug,
        unidadeInicial: {
          id: unidadeId,
          nome: nomeUnidadeInicial,
          localizacao: localizacaoUnidadeInicial,
        },
        responsavelInicial: {
          nome: nomeResponsavel,
          email: emailResponsavel,
        },
        convite: {
          id: conviteId,
          expiraEm: expiraEm.toISOString(),
          cargoCodigo: 'ADMIN',
        },
      },
    });

    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const frontendBaseUrl = resolveInviteFrontendBaseUrl({
      frontendNgrokBaseUrl: this.config.get<string>(
        'FRONTEND_NGROK_PUBLIC_BASE_URL',
      ),
      frontendPublicBaseUrl: this.config.get<string>('FRONTEND_PUBLIC_BASE_URL'),
      nodeEnv: this.config.get<string>('NODE_ENV'),
    });
    const invitePath = normalizePortalPath(
      this.config.get<string>('FRONTEND_INVITE_PORTAL_PATH'),
      '/convite',
    );
    const inviteLink = buildInviteLink({
      baseUrl: frontendBaseUrl,
      invitePath,
      token: inviteToken,
      emailDestino: emailResponsavel,
      empresaSlug: slug,
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
          nomeDestinatario: nomeResponsavel,
          nomeEmpresa,
          linkConvite: inviteLink,
          dataExpiracao,
          cargoCodigo: 'ADMIN',
          cargoExibicao: 'Administrador empresa',
        });
        await this.emailPort.send({
          to: emailResponsavel,
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
      empresa: {
        id: empresaId,
        nomeEmpresa,
        slug,
      },
      unidadeInicial: {
        id: unidadeId,
        nome: nomeUnidadeInicial,
        localizacao: localizacaoUnidadeInicial,
      },
      responsavelInicial: {
        nome: nomeResponsavel,
        email: emailResponsavel,
      },
      convite: {
        id: conviteId,
        expiraEm: expiraEm.toISOString(),
        cargoCodigo: 'ADMIN',
        token: isProd ? undefined : inviteToken,
      },
      entregaEmail,
      links: {
        convite: inviteLink,
      },
    };
  }
}
