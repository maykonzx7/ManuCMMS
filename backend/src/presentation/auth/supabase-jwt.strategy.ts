import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUserContext } from './auth-user.types';

type SupabaseJwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
};

/** Mesmos valores de `test/jest-setup-env.ts` — só para dev sem `.env` completo. */
const DEV_JWT_SECRET_FALLBACK =
  'test-jwt-secret-for-automated-tests-min-32-chars';
const DEV_SUPABASE_URL_FALLBACK = 'https://test-project-ref.supabase.co';

/**
 * Valida access tokens emitidos pelo Supabase Auth (HS256, issuer / audience padrão do projeto).
 * JWT Secret: Dashboard → Project Settings → API → JWT Secret.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  'supabase-jwt',
) {
  constructor(config: ConfigService) {
    const nodeEnv = config.get<string>('NODE_ENV', 'development');
    const isProd = nodeEnv === 'production';

    let secret = config.get<string>('SUPABASE_JWT_SECRET');
    let supabaseUrl = config.get<string>('SUPABASE_URL');

    if (!secret?.trim()) {
      if (isProd) {
        throw new Error(
          'SUPABASE_JWT_SECRET é obrigatório em produção. Defina em backend/.env (veja .env.example).',
        );
      }
      secret = DEV_JWT_SECRET_FALLBACK;
      Logger.warn(
        'SUPABASE_JWT_SECRET ausente — usando fallback só para desenvolvimento. Copie backend/.env.example para .env e preencha com o JWT Secret do Supabase.',
      );
    }

    if (!supabaseUrl?.trim()) {
      if (isProd) {
        throw new Error(
          'SUPABASE_URL é obrigatório em produção. Defina em backend/.env.',
        );
      }
      supabaseUrl = DEV_SUPABASE_URL_FALLBACK;
      Logger.warn(
        'SUPABASE_URL ausente — usando placeholder de desenvolvimento.',
      );
    }

    const url = supabaseUrl.replace(/\/$/, '');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      issuer: `${url}/auth/v1`,
      audience: 'authenticated',
    });
  }

  validate(payload: SupabaseJwtPayload): AuthUserContext {
    if (!payload.sub) {
      throw new UnauthorizedException('Token sem subject (sub)');
    }
    return {
      userId: payload.sub,
      email: payload.email ?? null,
      role: payload.role ?? null,
    };
  }
}
