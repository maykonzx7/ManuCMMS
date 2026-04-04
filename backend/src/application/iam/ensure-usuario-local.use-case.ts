import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import {
  USUARIO_READ_PORT,
  type CreateUsuarioBootstrapInput,
  type IUsuarioReadPort,
} from '../../domain/ports/usuario-read.port';

const PERFIS_BOOTSTRAP = [
  'TECNICO',
  'SUPERVISOR',
  'GESTOR',
  'AUDITOR',
  'ADMIN',
] as const;

type PerfilBootstrap = (typeof PERFIS_BOOTSTRAP)[number];

function parsePerfil(v: string | undefined): PerfilBootstrap {
  const p = (v ?? 'TECNICO').toUpperCase();
  if ((PERFIS_BOOTSTRAP as readonly string[]).includes(p)) {
    return p as PerfilBootstrap;
  }
  return 'TECNICO';
}

/**
 * Garante uma linha em `usuario` para o `sub` do JWT (provisionamento no primeiro acesso).
 * Unidade padrão: `AUTH_BOOTSTRAP_UNIDADE_ID` ou primeira unidade fabril cadastrada.
 */
@Injectable()
export class EnsureUsuarioLocalUseCase {
  constructor(
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    private readonly config: ConfigService,
  ) {}

  async execute(jwt: {
    userId: string;
    email: string | null;
    role: string | null;
  }): Promise<UsuarioLocalContext> {
    const existente = await this.usuarios.findByAuthSub(jwt.userId);
    if (existente) {
      return existente;
    }

    const idUnidadeFixo = this.config
      .get<string>('AUTH_BOOTSTRAP_UNIDADE_ID')
      ?.trim();
    let idUnidade: string | null = null;
    if (idUnidadeFixo) {
      const u = await this.unidades.findById(idUnidadeFixo);
      idUnidade = u?.id ?? null;
    }
    if (!idUnidade) {
      const todas = await this.unidades.listAll();
      if (todas.length === 0) {
        throw new ServiceUnavailableException(
          'Não há unidade fabril cadastrada; crie uma unidade antes do primeiro login (ou defina AUTH_BOOTSTRAP_UNIDADE_ID).',
        );
      }
      idUnidade = todas[0].id;
    }

    const email =
      jwt.email?.trim() ||
      `u.${jwt.userId.replace(/-/g, '').slice(0, 32)}@auth.bootstrap`;
    const nomeBase = jwt.email?.split('@')[0]?.trim() || 'Colaborador';
    const nome =
      nomeBase.length > 0 && nomeBase.length <= 150 ? nomeBase : 'Colaborador';

    const perfil = parsePerfil(
      this.config.get<string>('AUTH_BOOTSTRAP_PERFIL'),
    );

    const payload: CreateUsuarioBootstrapInput = {
      authSub: jwt.userId,
      email: email.length > 100 ? email.slice(0, 100) : email,
      nome,
      idUnidade,
      perfil,
    };

    return this.usuarios.createBootstrap(payload);
  }
}
