import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUserContext } from '../auth/auth-user.types';

type RequestWithUser = Request & { user: AuthUserContext };

/**
 * JWT Supabase + usuário corporativo local (`usuario` / `auth_sub`).
 */
@Controller('me')
export class MeController {
  @Get()
  getMe(@Req() req: RequestWithUser) {
    const u = req.user;
    const local = req.usuarioLocal;
    return {
      userId: u.userId,
      email: u.email,
      role: u.role,
      usuario: local
        ? {
            id: local.id,
            idUnidade: local.idUnidade,
            nome: local.nome,
            email: local.email,
            perfil: local.perfil,
          }
        : null,
    };
  }
}
