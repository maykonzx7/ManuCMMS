import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUserContext } from './auth-user.types';

type SupabaseJwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
};

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
    const secret = config.getOrThrow<string>('SUPABASE_JWT_SECRET');
    const supabaseUrl = config
      .getOrThrow<string>('SUPABASE_URL')
      .replace(/\/$/, '');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      issuer: `${supabaseUrl}/auth/v1`,
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
