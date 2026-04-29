import { Inject, Injectable } from '@nestjs/common';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import {
  USUARIO_READ_PORT,
  type IUsuarioReadPort,
} from '../../domain/ports/usuario-read.port';

@Injectable()
export class ListUsuariosByUnidadeUseCase {
  constructor(
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
  ) {}

  execute(idUnidade: string): Promise<UsuarioLocalContext[]> {
    return this.usuarios.listByUnidade(idUnidade);
  }
}
