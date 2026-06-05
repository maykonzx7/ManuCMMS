import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { AuthUserContext } from '../../presentation/auth/auth-user.types';
import { AcceptConviteAcessoUseCase } from './accept-convite-acesso.use-case';
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
    const token = input.token?.trim() ?? '';
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

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const conviteRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        emailDestino: string;
        status: string;
        expiraEm: Date;
        empresaSlug: string;
      }>
    >(Prisma.sql`
      SELECT
        ca.id,
        ca.email_destino AS "emailDestino",
        ca.status::text AS status,
        ca.expira_em AS "expiraEm",
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
    if (
      convite.status !== 'PENDENTE' ||
      convite.expiraEm.getTime() < Date.now()
    ) {
      throw new BadRequestException('Convite expirado ou indisponivel.');
    }

    const emailDestino = normalizeEmail(convite.emailDestino);
    if (!emailDestino) {
      throw new BadRequestException('Convite possui email de destino invalido.');
    }

    let authSub: string;
    try {
      authSub = await this.supabaseAdmin.provisionConfirmedUser({
        email: emailDestino,
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

    const authUser: AuthUserContext = {
      userId: authSub,
      email: emailDestino,
      role: 'authenticated',
      emailConfirmedAt: new Date().toISOString(),
      appMetadata: {},
      userMetadata: { full_name: nome },
    };

    const result = await this.acceptConvite.execute(authUser, { token, nome });

    return {
      ...result,
      email: emailDestino,
      empresaSlug: convite.empresaSlug,
    };
  }
}
