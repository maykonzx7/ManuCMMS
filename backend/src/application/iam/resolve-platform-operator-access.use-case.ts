import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  UsuarioCargoContext,
  UsuarioLocalContext,
} from '../../domain/entities/usuario-local';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import type { AuthUserContext } from '../../presentation/auth/auth-user.types';
import { AuthorizePlatformOperatorUseCase } from './authorize-platform-operator.use-case';

const PLATFORM_OPERATOR_ADMIN_PERMISSIONS = [
  'empresa.gerenciar',
  'unidade.visualizar',
  'usuario.visualizar_unidade',
  'usuario.convidar',
  'ativo.visualizar',
  'ativo.criar',
  'os.visualizar_unidade',
  'os.criar',
  'os.executar',
  'os.cancelar',
  'os.fechar',
  'dashboard.executivo',
] as const;

@Injectable()
export class ResolvePlatformOperatorAccessUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorizePlatformOperator: AuthorizePlatformOperatorUseCase,
  ) {}

  async execute(
    authUser: AuthUserContext,
    usuarioLocal: UsuarioLocalContext,
    preferredEmpresaSlug: string,
  ): Promise<UsuarioLocalContext | null> {
    if (!this.authorizePlatformOperator.isOperator(authUser)) {
      return null;
    }

    const expectedSlug = preferredEmpresaSlug.trim().toLowerCase();
    const currentSlug = usuarioLocal.empresa?.slug?.trim().toLowerCase() ?? '';
    if (!expectedSlug || currentSlug === expectedSlug) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<
      Array<{
        empresaId: string;
        nomeEmpresa: string;
        slug: string;
        status: string;
        unidadeId: string;
      }>
    >(Prisma.sql`
      SELECT
        e.id AS "empresaId",
        e.nome_empresa AS "nomeEmpresa",
        e.slug,
        e.status::text AS status,
        uf.id AS "unidadeId"
      FROM empresa e
      JOIN LATERAL (
        SELECT id
        FROM unidade_fabril
        WHERE empresa_id = e.id
          AND status = 'ATIVA'
        ORDER BY created_at ASC
        LIMIT 1
      ) uf ON TRUE
      WHERE lower(e.slug) = ${expectedSlug}
      LIMIT 1
    `);

    const target = rows[0];
    if (!target) {
      throw new ForbiddenException('Cliente solicitado nao foi encontrado.');
    }

    const empresaStatus = target.status.trim().toUpperCase();
    if (empresaStatus !== 'ATIVA') {
      throw new ForbiddenException(
        'A conta do cliente esta inativa ou suspensa.',
      );
    }

    const cargo: UsuarioCargoContext = {
      id: 'platform-operator',
      codigo: 'PLATFORM_OPERATOR',
      nome: 'Operador Plataforma',
      nivelHierarquico: 999,
      idUnidade: null,
      permissoes: [...PLATFORM_OPERATOR_ADMIN_PERMISSIONS],
    };

    return {
      ...usuarioLocal,
      idUnidade: target.unidadeId,
      // Visualização operacional do cliente — não eleva para ADMIN da empresa.
      perfil: 'GESTOR',
      empresa: {
        id: target.empresaId,
        nomeEmpresa: target.nomeEmpresa,
        slug: target.slug,
        status: target.status,
      },
      cargos: [cargo],
      permissoes: [...PLATFORM_OPERATOR_ADMIN_PERMISSIONS],
      isWorkspaceImpersonation: true,
    };
  }
}
