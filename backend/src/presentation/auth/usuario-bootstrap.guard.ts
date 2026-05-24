import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { EnsureUsuarioLocalUseCase } from '../../application/iam/ensure-usuario-local.use-case';
import type { AuthUserContext } from './auth-user.types';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ALLOW_PENDING_USER_KEY } from './allow-pending-user.decorator';

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
    const allowPendingUser = this.reflector.getAllAndOverride<boolean>(
      ALLOW_PENDING_USER_KEY,
      [context.getHandler(), context.getClass()],
    );

    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUserContext | undefined;
    if (!user?.userId) {
      return false;
    }

    try {
      const preferredEmpresaSlug = this.resolvePreferredEmpresaSlug(req);
      req.usuarioLocal = await this.ensureUsuario.execute(user, {
        preferredEmpresaSlug,
      });
    } catch (error) {
      if (allowPendingUser && error instanceof ForbiddenException) {
        req.usuarioLocal = undefined;
      } else {
        throw error;
      }
    }
    return true;
  }

  private resolvePreferredEmpresaSlug(req: Request): string | null {
    const raw = req.headers['x-company-slug'];
    const slug = Array.isArray(raw) ? raw[0] : raw;
    const normalized = (slug ?? '').trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }
}
