import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUserContext } from '../auth/auth-user.types';

type RequestWithUser = Request & { user: AuthUserContext };

/**
 * Exemplo de rota protegida pelo JWT do Supabase (RF-02 / NF-02).
 */
@Controller('me')
export class MeController {
  @Get()
  getMe(@Req() req: RequestWithUser) {
    const u = req.user;
    return {
      userId: u.userId,
      email: u.email,
      role: u.role,
    };
  }
}
