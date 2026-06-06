import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUserContext } from '../../presentation/auth/auth-user.types';
import { AcceptConviteAcessoUseCase } from './accept-convite-acesso.use-case';
import {
  hashConviteToken,
  normalizeConviteToken,
} from './convite-token.shared';
import { normalizeDisplayName, normalizeEmail } from './onboarding.shared';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { SupabaseAdminService } from '../../infrastructure/auth/supabase-admin.service';

@Injectable()
export class ActivateConviteAcessoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseAdmin: SupabaseAdminService,
    private readonly acceptConvite: AcceptConviteAcessoUseCase,
  ) {}

  async execute(input: { token: string; nome: string; senha: string }) {
    const token = normalizeConviteToken(input.token);
    if (token.length < 20) {
      throw new BadRequestException('Token de convite invalido.');
    }

    const nome = normalizeDisplayName(input.nome, 'Colaborador');
    const senha = input.senha?.trim() ?? '';
    if (senha.length < 8 || senha.length > 72) {
      throw new BadRequestException(
        'senha invalida. Use entre 8 e 72 caracteres.',
      );
    }

    if (!this.supabaseAdmin.isConfigured()) {
      throw new InternalServerErrorException(
        'Ativacao de convite indisponivel: configure SUPABASE_SERVICE_ROLE_KEY no servidor.',
      );
    }

    const tokenHash = hashConviteToken(token);
    const conviteRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        emailDestino: string;
        status: string;
        expiraEm: Date;
        empresaSlug: string;
        usuarioCriadoId: string | null;
      }>
    >(Prisma.sql`
      SELECT
        ca.id,
        ca.email_destino AS "emailDestino",
        ca.status::text AS status,
        ca.expira_em AS "expiraEm",
        ca.usuario_criado_id AS "usuarioCriadoId",
        e.slug AS "empresaSlug"
      FROM convite_acesso ca
      JOIN empresa e ON e.id = ca.empresa_id
      WHERE ca.token_hash = ${tokenHash}
      LIMIT 1
    `);

    const convite = conviteRows[0];
    if (!convite) {
      throw new BadRequestException('Convite nao encontrado.');
    }

    const emailDestino = normalizeEmail(convite.emailDestino);
    if (!emailDestino) {
      throw new BadRequestException('Convite possui email de destino invalido.');
    }

    if (convite.status === 'ACEITO') {
      const authSub = await this.provisionAuthUser(emailDestino, senha, nome);
      const authUser: AuthUserContext = {
        userId: authSub,
        email: emailDestino,
        role: 'authenticated',
        emailConfirmedAt: new Date().toISOString(),
        appMetadata: {},
        userMetadata: { full_name: nome },
      };
      const result = await this.acceptConvite.execute(authUser, { token, nome });
      const authSession = await this.createAuthSession(emailDestino, senha);
      return {
        ...result,
        email: emailDestino,
        empresaSlug: convite.empresaSlug,
        alreadyActivated: true,
        authSession,
      };
    }

    if (convite.status !== 'PENDENTE') {
      throw new BadRequestException('Convite expirado ou indisponivel.');
    }

    const expiradoRows = await this.prisma.$queryRaw<Array<{ expirado: boolean }>>(
      Prisma.sql`
        SELECT (expira_em <= NOW()) AS expirado
        FROM convite_acesso
        WHERE id = ${convite.id}::uuid
        LIMIT 1
      `,
    );
    if (expiradoRows[0]?.expirado) {
      throw new BadRequestException('Convite expirado ou indisponivel.');
    }

    const authSub = await this.provisionAuthUser(emailDestino, senha, nome);

    const authUser: AuthUserContext = {
      userId: authSub,
      email: emailDestino,
      role: 'authenticated',
      emailConfirmedAt: new Date().toISOString(),
      appMetadata: {},
      userMetadata: { full_name: nome },
    };

    const result = await this.acceptConvite.execute(authUser, { token, nome });
    const authSession = await this.createAuthSession(emailDestino, senha);

    return {
      ...result,
      email: emailDestino,
      empresaSlug: convite.empresaSlug,
      alreadyActivated: false,
      authSession,
    };
  }

  private async createAuthSession(email: string, senha: string) {
    try {
      const session = await this.supabaseAdmin.createPasswordSession({
        email,
        password: senha,
      });
      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in,
        tokenType: session.token_type,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Conta ativada, mas nao foi possivel iniciar a sessao automaticamente.',
      );
    }
  }

  private async provisionAuthUser(
    email: string,
    senha: string,
    nome: string,
  ): Promise<string> {
    try {
      return await this.supabaseAdmin.provisionConfirmedUser({
        email,
        password: senha,
        nome,
      });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Falha ao provisionar conta de autenticacao.',
      );
    }
  }
}
