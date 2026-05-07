import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import {
  USUARIO_READ_PORT,
  type IUsuarioReadPort,
} from '../../domain/ports/usuario-read.port';

@Injectable()
export class GetUsuarioByIdInUnidadeUseCase {
  constructor(
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
  ) {}

  async execute(
    idUnidade: string,
    idUsuario: string,
  ): Promise<UsuarioLocalContext> {
    const usuario = await this.usuarios.findByIdInUnidade(idUsuario, idUnidade);
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado nesta unidade');
    }
    return usuario;
  }
}
