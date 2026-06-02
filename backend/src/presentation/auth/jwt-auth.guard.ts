import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SupabaseAuthService } from './supabase-auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

function readCookie(req: Request, key: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const chunks = raw.split(';');
  for (const chunk of chunks) {
    const [cookieKey, ...rest] = chunk.trim().split('=');
    if (cookieKey !== key) continue;
    const value = rest.join('=').trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly trustedOrigins: string[];
  private readonly isProduction: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseAuth: SupabaseAuthService,
    private readonly config: ConfigService,
  ) {
    const env = (this.config.get<string>('NODE_ENV') ?? 'development')
      .trim()
      .toLowerCase();
    this.isProduction = env === 'production';
    this.trustedOrigins = (
      this.config.get<string>('CORS_ALLOWED_ORIGINS') ?? ''
    )
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private isUnsafeMethod(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }

  private isLocalDevOrigin(origin: string): boolean {
    try {
      const { protocol, hostname } = new URL(origin);
      if (protocol !== 'http:' && protocol !== 'https:') return false;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1'
      ) {
        return true;
      }
      if (hostname.startsWith('192.168.')) return true;
      if (hostname.startsWith('10.')) return true;
      return /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);
    } catch {
      return false;
    }
  }

  private headerValue(
    value: string | string[] | undefined,
  ): string | undefined {
    const raw = Array.isArray(value) ? value[0] : value;
    const trimmed = raw?.trim();
    return trimmed ? trimmed : undefined;
  }

  private resolveOrigin(req: Request): string | null {
    const origin = this.headerValue(req.headers.origin);
    if (origin) return origin;
    const referer = this.headerValue(req.headers.referer);
    if (!referer) return null;
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  private ensureTrustedBrowserOrigin(req: Request): void {
    if (!this.isUnsafeMethod(req.method)) return;
    const origin = this.resolveOrigin(req);
    if (!origin) {
      throw new UnauthorizedException(
        'Origem da requisição ausente para operação sensível.',
      );
    }
    if (this.trustedOrigins.includes(origin)) return;
    if (!this.isProduction && this.isLocalDevOrigin(origin)) return;
    throw new UnauthorizedException('Origem da requisição não autorizada.');
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null;
    const cookieToken = readCookie(req, 'manucmms_access_token');
    const accessToken = bearerToken || cookieToken;

    if (!accessToken) {
      throw new UnauthorizedException('Token de autenticação ausente.');
    }

    // Quando autenticado via cookie HttpOnly, exigir validação de origem em mutações
    // para reduzir risco de CSRF sem quebrar clientes Bearer token.
    if (!bearerToken && cookieToken) {
      this.ensureTrustedBrowserOrigin(req);
    }

    req.user = await this.supabaseAuth.validateAccessToken(accessToken);
    return true;
  }
}
