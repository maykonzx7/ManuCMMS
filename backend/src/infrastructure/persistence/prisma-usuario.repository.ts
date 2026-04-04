import { Injectable } from '@nestjs/common';
import type { IUsuarioReadPort } from '../../domain/ports/usuario-read.port';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUsuarioRepository implements IUsuarioReadPort {
  constructor(private readonly prisma: PrismaService) {}

  async existsInUnidade(
    idUsuario: string,
    idUnidade: string,
  ): Promise<boolean> {
    const n = await this.prisma.usuario.count({
      where: { id: idUsuario, idUnidade },
    });
    return n > 0;
  }
}
