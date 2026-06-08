import {
  ForbiddenException,
  InternalServerErrorException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import {
  USUARIO_READ_PORT,
  type IUsuarioReadPort,
  type PerfilUsuarioCodigo,
} from '../../domain/ports/usuario-read.port';
import { AppCacheService } from '../../infrastructure/cache/app-cache.service';
import type { AuthUserContext } from '../../presentation/auth/auth-user.types';
import { AuthorizePlatformOperatorUseCase } from './authorize-platform-operator.use-case';
import { ResolvePlatformOperatorAccessUseCase } from './resolve-platform-operator-access.use-case';

/**
 * Garante contexto local de usuário previamente cadastrado/vinculado.
 * Não faz provisionamento automático para evitar acesso sem convite.
 */
@Injectable()
export class EnsureUsuarioLocalUseCase {
  private static readonly CACHE_TTL_SECONDS = 120;
  private static readonly ACCESS_ENSURED_TTL_SECONDS = 3600;

  constructor(
    private readonly config: ConfigService,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
    private readonly resolvePlatformOperatorAccess: ResolvePlatformOperatorAccessUseCase,
    private readonly authorizePlatformOperator: AuthorizePlatformOperatorUseCase,
    private readonly cache: AppCacheService,
  ) {}

  async execute(
    authUser: AuthUserContext,
    options?: { preferredEmpresaSlug?: string | null },
  ): Promise<UsuarioLocalContext> {
    const preferredEmpresaSlug = options?.preferredEmpresaSlug ?? null;
    const cacheKey = this.buildCacheKey(authUser.userId, preferredEmpresaSlug);

    const cached = await this.cache.get<UsuarioLocalContext>(cacheKey);
    if (cached) {
      this.assertPreferredEmpresaScope(cached, preferredEmpresaSlug);
      this.assertAccessIsActive(cached, authUser);
      return cached;
    }

    const resolved = await this.resolveUsuarioLocal(authUser, preferredEmpresaSlug);
    await this.cache.set(
      cacheKey,
      resolved,
      EnsureUsuarioLocalUseCase.CACHE_TTL_SECONDS,
    );
    return resolved;
  }

  async invalidateUsuarioContext(
    authSub: string,
    preferredEmpresaSlug?: string | null,
  ): Promise<void> {
    await this.cache.del(this.buildCacheKey(authSub, preferredEmpresaSlug ?? null));
    if (preferredEmpresaSlug) {
      await this.cache.del(this.buildCacheKey(authSub, null));
    }
  }

  private buildCacheKey(
    authSub: string,
    preferredEmpresaSlug: string | null,
  ): string {
    const slug = preferredEmpresaSlug?.trim().toLowerCase() ?? '';
    return `usuario-ctx:${authSub}:${slug}`;
  }

  private async resolveUsuarioLocal(
    authUser: AuthUserContext,
    preferredEmpresaSlug: string | null,
  ): Promise<UsuarioLocalContext> {
    const existentePorSub = await this.usuarios.findByAuthSub(
      authUser.userId,
      preferredEmpresaSlug,
    );
    if (existentePorSub) {
      const platformContext = preferredEmpresaSlug
        ? await this.resolvePlatformOperatorAccess.execute(
            authUser,
            existentePorSub,
            preferredEmpresaSlug,
          )
        : null;
      const resolved = platformContext ?? existentePorSub;

      await this.ensureAccessContextOnce(resolved);

      if (!platformContext) {
        this.assertPreferredEmpresaScope(resolved, preferredEmpresaSlug);
      }
      this.assertAccessIsActive(resolved, authUser);
      return resolved;
    }

    const allowAuthSubLinkByEmail =
      this.config.get<string>('ALLOW_AUTH_SUB_LINK_BY_EMAIL') === 'true';
    const nodeEnv =
      this.config.get<string>('NODE_ENV')?.trim().toLowerCase() ??
      'development';
    const isProduction = nodeEnv === 'production';
    if (isProduction && allowAuthSubLinkByEmail) {
      throw new InternalServerErrorException(
        'Configuracao insegura: ALLOW_AUTH_SUB_LINK_BY_EMAIL=true nao e permitido em producao.',
      );
    }

    const emailJwt = authUser.email?.trim().toLowerCase();
    if (allowAuthSubLinkByEmail && emailJwt) {
      if (!authUser.emailConfirmedAt) {
        throw new ForbiddenException(
          'Nao foi possivel vincular login sem email confirmado no provedor de autenticacao.',
        );
      }
      const existentePorEmail = await this.usuarios.findByEmail(
        emailJwt,
        preferredEmpresaSlug,
      );
      if (existentePorEmail) {
        await this.usuarios.updateAuthSub(existentePorEmail.id, authUser.userId);

        await this.ensureAccessContextOnce(existentePorEmail);

        const atualizado = await this.usuarios.findByAuthSub(
          authUser.userId,
          preferredEmpresaSlug,
        );
        if (atualizado) {
          const platformContext = preferredEmpresaSlug
            ? await this.resolvePlatformOperatorAccess.execute(
                authUser,
                atualizado,
                preferredEmpresaSlug,
              )
            : null;
          const resolved = platformContext ?? atualizado;
          if (!platformContext) {
            this.assertPreferredEmpresaScope(resolved, preferredEmpresaSlug);
          }
          this.assertAccessIsActive(resolved, authUser);
          return resolved;
        }

        const platformContext = preferredEmpresaSlug
          ? await this.resolvePlatformOperatorAccess.execute(
              authUser,
              existentePorEmail,
              preferredEmpresaSlug,
            )
          : null;
        const resolved = platformContext ?? existentePorEmail;
        if (!platformContext) {
          this.assertPreferredEmpresaScope(resolved, preferredEmpresaSlug);
        }
        this.assertAccessIsActive(resolved, authUser);
        return resolved;
      }
    }

    throw new ForbiddenException(
      'Usuario sem vinculo local. Solicite convite de acesso da empresa.',
    );
  }

  private async ensureAccessContextOnce(
    usuarioLocal: UsuarioLocalContext,
  ): Promise<void> {
    const empresaId = usuarioLocal.empresa?.id ?? null;
    if (!empresaId) return;

    const cacheKey = `access-ensured:${usuarioLocal.id}:${empresaId}`;
    if (await this.cache.get<boolean>(cacheKey)) {
      return;
    }

    await this.usuarios.ensureAccessContext({
      idUsuario: usuarioLocal.id,
      idUnidade: usuarioLocal.idUnidade,
      idUnidadeCargo: usuarioLocal.idUnidade,
      empresaId,
      perfil: usuarioLocal.perfil as PerfilUsuarioCodigo,
    });
    await this.cache.set(
      cacheKey,
      true,
      EnsureUsuarioLocalUseCase.ACCESS_ENSURED_TTL_SECONDS,
    );
  }

  private assertPreferredEmpresaScope(
    usuarioLocal: UsuarioLocalContext,
    preferredEmpresaSlug: string | null,
  ): void {
    const expected = preferredEmpresaSlug?.trim().toLowerCase() ?? '';
    if (!expected) return;
    const current = usuarioLocal.empresa?.slug?.trim().toLowerCase() ?? '';
    if (current === expected) return;
    throw new ForbiddenException(
      'Seu usuario nao possui acesso ao portal desta empresa.',
    );
  }

  private assertAccessIsActive(
    usuarioLocal: UsuarioLocalContext,
    authUser: AuthUserContext,
  ): void {
    const isPlatformOperator =
      this.authorizePlatformOperator.isOperator(authUser);
    const globalStatus = usuarioLocal.status?.trim().toUpperCase() ?? 'ATIVO';

    if (globalStatus === 'BLOQUEADO') {
      throw new ForbiddenException(
        'Seu usuário está bloqueado. Contate o administrador da plataforma.',
      );
    }

    if (!isPlatformOperator && globalStatus !== 'ATIVO') {
      throw new ForbiddenException(
        'Seu usuário está inativo ou bloqueado. Contate o administrador da empresa.',
      );
    }

    if (!usuarioLocal.isWorkspaceImpersonation) {
      const membershipStatus =
        usuarioLocal.statusMembros?.trim().toUpperCase() ??
        usuarioLocal.empresa?.statusMembros?.trim().toUpperCase() ??
        'ATIVO';
      if (membershipStatus !== 'ATIVO') {
        throw new ForbiddenException(
          'Seu acesso nesta empresa está inativo ou pendente. Contate o administrador da empresa.',
        );
      }
    }

    const empresaStatus =
      usuarioLocal.empresa?.status?.trim().toUpperCase() ?? 'ATIVA';
    if (empresaStatus !== 'ATIVA') {
      throw new ForbiddenException(
        'A conta da empresa está inativa ou suspensa. Contate o administrador responsável.',
      );
    }
  }
}
