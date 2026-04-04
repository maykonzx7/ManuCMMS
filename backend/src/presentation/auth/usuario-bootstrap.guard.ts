import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { EnsureUsuarioLocalUseCase } from '../../application/iam/ensure-usuario-local.use-case';
import type { AuthUserContext } from './auth-user.types';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Após JWT válido, garante registro em `public.usuario` (auth_sub = sub).
 * Rotas `@Public()` são ignoradas.
 */
@Injectable()
export class UsuarioBootstrapGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly ensureUsuario: EnsureUsuarioLocalUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUserContext | undefined;
    if (!user?.userId) {
      return false;
    }

    req.usuarioLocal = await this.ensureUsuario.execute(user);
    return true;
  }
}
