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
  ) {}

  async execute(jwt: {
    userId: string;
    email: string | null;
    role: string | null;
    emailConfirmedAt: string | null;
  },
  ): Promise<UsuarioLocalContext> {
    const existentePorSub = await this.usuarios.findByAuthSub(jwt.userId);
    if (existentePorSub) {
      await this.usuarios.ensureAccessContext({
        idUsuario: existentePorSub.id,
        idUnidade: existentePorSub.idUnidade,
        idUnidadeCargo: existentePorSub.idUnidade,
        empresaId: existentePorSub.empresa?.id ?? null,
        perfil: existentePorSub.perfil as PerfilUsuarioCodigo,
      });

      const atualizado = await this.usuarios.findByAuthSub(jwt.userId);
      if (atualizado) {
        return atualizado;
      }

      return existentePorSub;
    }

    const allowAuthSubLinkByEmail =
      this.config.get<string>('ALLOW_AUTH_SUB_LINK_BY_EMAIL') === 'true';
    const nodeEnv = this.config.get<string>('NODE_ENV')?.trim().toLowerCase() ?? 'development';
    const isProduction = nodeEnv === 'production';
    if (isProduction && allowAuthSubLinkByEmail) {
      throw new InternalServerErrorException(
        'Configuracao insegura: ALLOW_AUTH_SUB_LINK_BY_EMAIL=true nao e permitido em producao.',
      );
    }

    const emailJwt = jwt.email?.trim().toLowerCase();
    if (allowAuthSubLinkByEmail && emailJwt) {
      const existentePorEmail = await this.usuarios.findByEmail(emailJwt);
      if (existentePorEmail) {
        await this.usuarios.updateAuthSub(existentePorEmail.id, jwt.userId);

        await this.usuarios.ensureAccessContext({
          idUsuario: existentePorEmail.id,
          idUnidade: existentePorEmail.idUnidade,
          idUnidadeCargo: existentePorEmail.idUnidade,
          empresaId: existentePorEmail.empresa?.id ?? null,
          perfil: existentePorEmail.perfil as PerfilUsuarioCodigo,
        });

        const atualizado = await this.usuarios.findByAuthSub(jwt.userId);
        if (atualizado) {
          return atualizado;
        }

        return existentePorEmail;
      }
    }

    throw new ForbiddenException(
      'Usuario sem vinculo local. Solicite convite de acesso da empresa.',
    );
  }
}
