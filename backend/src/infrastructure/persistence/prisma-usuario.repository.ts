import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import type {
  CreateUsuarioBootstrapInput,
  IUsuarioReadPort,
} from '../../domain/ports/usuario-read.port';
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

  async listByUnidade(idUnidade: string): Promise<UsuarioLocalContext[]> {
    const rows = await this.prisma.usuario.findMany({
      where: { idUnidade },
      orderBy: [{ nome: 'asc' }, { email: 'asc' }],
    });
    return rows.map((row) => this.toLocalContext(row));
  }

  async findByAuthSub(authSub: string): Promise<UsuarioLocalContext | null> {
    const r = await this.prisma.usuario.findUnique({
      where: { authSub },
    });
    if (!r) {
      return null;
    }
    return this.toLocalContext(r);
  }

  async createBootstrap(
    input: CreateUsuarioBootstrapInput,
  ): Promise<UsuarioLocalContext> {
    try {
      const r = await this.prisma.usuario.create({
        data: {
          authSub: input.authSub,
          email: input.email,
          nome: input.nome,
          idUnidade: input.idUnidade,
          perfil: input.perfil,
        },
      });
      return this.toLocalContext(r);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const again = await this.findByAuthSub(input.authSub);
        if (again) {
          return again;
        }
      }
      throw e;
    }
  }

  private toLocalContext(r: {
    id: string;
    authSub: string;
    idUnidade: string;
    nome: string;
    email: string;
    perfil: string;
  }): UsuarioLocalContext {
    return {
      id: r.id,
      authSub: r.authSub,
      idUnidade: r.idUnidade,
      nome: r.nome,
      email: r.email,
      perfil: r.perfil,
    };
  }
}
