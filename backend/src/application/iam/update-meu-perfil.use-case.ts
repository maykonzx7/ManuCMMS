import { Inject, Injectable } from '@nestjs/common';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import {
  USUARIO_READ_PORT,
  type IUsuarioReadPort,
} from '../../domain/ports/usuario-read.port';

@Injectable()
export class UpdateMeuPerfilUseCase {
  constructor(
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
  ) {}

  async execute(
    usuario: UsuarioLocalContext,
    fotoUrl: string | null,
  ): Promise<UsuarioLocalContext> {
    await this.usuarios.updateFotoUrl(usuario.id, fotoUrl);
    const atualizado = await this.usuarios.findByAuthSub(usuario.authSub);
    if (!atualizado) {
      throw new Error('Usuário não encontrado após atualização de perfil');
    }
    return atualizado;
  }
}
