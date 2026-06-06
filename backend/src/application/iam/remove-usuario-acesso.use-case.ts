import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { CreateConviteAcessoUseCase } from '../onboarding/create-convite-acesso.use-case';
import { normalizeEmail } from '../onboarding/onboarding.shared';

@Injectable()
export class RemoveUsuarioAcessoUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createConvite: CreateConviteAcessoUseCase,
  ) {}

  async execute(
    usuarioLocal: UsuarioLocalContext | undefined,
    empresaId: string,
    usuarioId: string,
    input?: {
      reenviarConvite?: boolean;
      cargoCodigo?: string;
      idUnidadeDestino?: string | null;
      nomeDestino?: string;
    },
  ) {
    if (!usuarioLocal?.empresa?.id) {
      throw new ForbiddenException(
        'Contexto da empresa autenticada nao esta disponivel.',
      );
    }

    if (usuarioLocal.empresa.id !== empresaId) {
      throw new ForbiddenException(
        'Nao e permitido remover acesso de usuario de outra empresa.',
      );
    }

    if (usuarioLocal.id === usuarioId) {
      throw new BadRequestException(
        'Voce nao pode remover o proprio acesso da empresa.',
      );
    }

    const targetRows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        nome: string;
        email: string;
        perfil: string;
        idUnidade: string;
        isResponsavelPrincipal: boolean;
      }>
    >(Prisma.sql`
      SELECT
        u.id,
        u.nome,
        u.email,
        u.perfil::text AS perfil,
        u.id_unidade AS "idUnidade",
        ue.is_responsavel_principal AS "isResponsavelPrincipal"
      FROM usuario u
      JOIN usuario_empresa ue ON ue.usuario_id = u.id
      WHERE u.id = ${usuarioId}::uuid
        AND ue.empresa_id = ${empresaId}::uuid
      LIMIT 1
    `);

    const target = targetRows[0];
    if (!target?.id) {
      throw new NotFoundException('Usuario nao encontrado nesta empresa.');
    }

    if (target.isResponsavelPrincipal) {
      throw new BadRequestException(
        'Nao e permitido remover o responsavel principal da empresa.',
      );
    }

    const emailDestino = normalizeEmail(target.email);
    const cargoCodigo = (input?.cargoCodigo ?? target.perfil).trim().toUpperCase();
    const idUnidadeDestino = input?.idUnidadeDestino?.trim() || target.idUnidade;

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM usuario_cargo uc
        USING usuario_empresa ue
        WHERE uc.usuario_empresa_id = ue.id
          AND ue.usuario_id = ${usuarioId}::uuid
          AND ue.empresa_id = ${empresaId}::uuid
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM usuario_empresa
        WHERE usuario_id = ${usuarioId}::uuid
          AND empresa_id = ${empresaId}::uuid
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE usuario
        SET
          status = 'INATIVO',
          updated_at = NOW()
        WHERE id = ${usuarioId}::uuid
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE convite_acesso
        SET status = 'CANCELADO', updated_at = NOW()
        WHERE empresa_id = ${empresaId}::uuid
          AND lower(email_destino) = ${emailDestino}
          AND status IN ('PENDENTE', 'ACEITO')
      `);
    });

    let conviteReenviado:
      | Awaited<ReturnType<CreateConviteAcessoUseCase['execute']>>
      | null = null;

    if (input?.reenviarConvite) {
      conviteReenviado = await this.createConvite.execute(
        usuarioLocal,
        empresaId,
        {
          emailDestino,
          nomeDestino: input?.nomeDestino?.trim() || target.nome,
          cargoCodigo,
          idUnidadeDestino,
        },
      );
    }

    return {
      ok: true,
      usuarioId,
      email: emailDestino,
      conviteReenviado,
    };
  }
}
