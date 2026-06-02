import {
  Body,
  Controller,
  Delete,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  AUDIT_LOG_PORT,
  type IAuditLogPort,
} from '../../domain/ports/audit-log.port';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { Public } from '../auth/public.decorator';

type CreateSessionBody = {
  accessToken?: string;
};

@Controller('auth/session')
export class AuthSessionController {
  constructor(
    private readonly supabaseAuth: SupabaseAuthService,
    @Inject(AUDIT_LOG_PORT) private readonly auditLog: IAuditLogPort,
  ) {}

  @Public()
  @Post()
  async create(
    @Body() body: CreateSessionBody,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const token = (body.accessToken ?? '').trim();
    if (!token) {
      res.status(400).json({ message: 'accessToken é obrigatório.' });
      return;
    }

    const authUser = await this.supabaseAuth.validateAccessToken(token);

    const secure =
      (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
    const sameSite = secure ? 'none' : 'lax';
    const maxAgeSeconds = Number(
      process.env.AUTH_SESSION_COOKIE_MAX_AGE_SECONDS ?? '28800',
    );
    res.cookie('manucmms_access_token', token, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: Math.max(300, maxAgeSeconds) * 1000,
    });

    const companySlugHeader = req.headers['x-company-slug'];
    const companySlug = Array.isArray(companySlugHeader)
      ? companySlugHeader[0]
      : companySlugHeader;
    if ((companySlug ?? '').trim()) {
      res.cookie(
        'manucmms_company_slug',
        String(companySlug).trim().toLowerCase(),
        {
          httpOnly: true,
          secure,
          sameSite,
          path: '/',
          maxAge: Math.max(300, maxAgeSeconds) * 1000,
        },
      );
    }

    await this.auditLog.append({
      idUsuario: authUser.userId,
      entidadeAfetada: 'AuthSession',
      idRegistro: randomUUID(),
      valorAnterior: {},
      valorNovo: {
        acao: 'LOGIN',
        origem: 'cookie_session',
        companySlug: (companySlug ?? '').trim().toLowerCase() || null,
      },
    });

    res.status(204).send();
  }

  @Public()
  @Delete()
  async clear(@Req() req: Request, @Res() res: Response) {
    const cookieToken = readCookie(req, 'manucmms_access_token');
    if (cookieToken) {
      try {
        const authUser =
          await this.supabaseAuth.validateAccessToken(cookieToken);
        await this.auditLog.append({
          idUsuario: authUser.userId,
          entidadeAfetada: 'AuthSession',
          idRegistro: randomUUID(),
          valorAnterior: {},
          valorNovo: {
            acao: 'LOGOUT',
            origem: 'cookie_session',
          },
        });
      } catch {
        // Logout deve seguir mesmo se o token ja expirou/invalido.
      }
    }

    const secure =
      (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
    const sameSite = secure ? 'none' : 'lax';
    res.clearCookie('manucmms_access_token', {
      path: '/',
      httpOnly: true,
      secure,
      sameSite,
    });
    res.clearCookie('manucmms_company_slug', {
      path: '/',
      httpOnly: true,
      secure,
      sameSite,
    });
    res.status(204).send();
  }
}

function readCookie(req: Request, name: string): string | null {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;
  const parts = rawCookie.split(';');
  for (const part of parts) {
    const [cookieName, ...valueParts] = part.trim().split('=');
    if (cookieName !== name) continue;
    const value = valueParts.join('=').trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}
