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
import type { AuthUserContext } from '../../presentation/auth/auth-user.types';
import { ResolvePlatformOperatorAccessUseCase } from './resolve-platform-operator-access.use-case';

/**
 * Garante contexto local de usuário previamente cadastrado/vinculado.
 * Não faz provisionamento automático para evitar acesso sem convite.
 */
@Injectable()
export class EnsureUsuarioLocalUseCase {
  constructor(
    private readonly config: ConfigService,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
    private readonly resolvePlatformOperatorAccess: ResolvePlatformOperatorAccessUseCase,
  ) {}

  async execute(
    authUser: AuthUserContext,
    options?: { preferredEmpresaSlug?: string | null },
  ): Promise<UsuarioLocalContext> {
    const preferredEmpresaSlug = options?.preferredEmpresaSlug ?? null;
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

      await this.usuarios.ensureAccessContext({
        idUsuario: resolved.id,
        idUnidade: resolved.idUnidade,
        idUnidadeCargo: resolved.idUnidade,
        empresaId: resolved.empresa?.id ?? null,
        perfil: resolved.perfil as PerfilUsuarioCodigo,
      });

      if (!platformContext) {
        this.assertPreferredEmpresaScope(resolved, preferredEmpresaSlug);
      }
      this.assertAccessIsActive(resolved);
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

        await this.usuarios.ensureAccessContext({
          idUsuario: existentePorEmail.id,
          idUnidade: existentePorEmail.idUnidade,
          idUnidadeCargo: existentePorEmail.idUnidade,
          empresaId: existentePorEmail.empresa?.id ?? null,
          perfil: existentePorEmail.perfil as PerfilUsuarioCodigo,
        });

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
          this.assertAccessIsActive(resolved);
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
        this.assertAccessIsActive(resolved);
        return resolved;
      }
    }

    throw new ForbiddenException(
      'Usuario sem vinculo local. Solicite convite de acesso da empresa.',
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

  private assertAccessIsActive(usuarioLocal: UsuarioLocalContext): void {
    const usuarioStatus = usuarioLocal.status?.trim().toUpperCase() ?? 'ATIVO';
    if (usuarioStatus !== 'ATIVO') {
      throw new ForbiddenException(
        'Seu usuário está inativo ou bloqueado. Contate o administrador da empresa.',
      );
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
