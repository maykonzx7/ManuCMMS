import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import type { AuthUserContext } from './auth-user.types';

type SupabaseJwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  aud?: string | string[];
  iss?: string;
};

type SupabaseUserResponse = {
  id: string;
  email?: string | null;
  role?: string | null;
};

function isPlaceholder(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? '';
  return (
    normalized.length === 0 ||
    normalized.includes('seu_project_ref') ||
    normalized.includes('cole_o_jwt_secret') ||
    normalized.includes('cole_a_anon_key') ||
    normalized.includes('sua_chave') ||
    normalized.includes('placeholder')
  );
}

@Injectable()
export class SupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);

  constructor(private readonly config: ConfigService) {}

  async validateAccessToken(accessToken: string): Promise<AuthUserContext> {
    const supabaseUrlRaw = this.config.get<string>('SUPABASE_URL')?.trim();
    const supabaseUrl = !isPlaceholder(supabaseUrlRaw) ? supabaseUrlRaw : null;
    const expectedIssuer = supabaseUrl
      ? `${supabaseUrl.replace(/\/$/, '')}/auth/v1`
      : null;

    const secretRaw = this.config.get<string>('SUPABASE_JWT_SECRET')?.trim();
    const secret = !isPlaceholder(secretRaw) ? secretRaw : null;

    if (secret && expectedIssuer) {
      return this.validateWithJwtSecret(accessToken, secret, expectedIssuer);
    }

    const anonKeyRaw = this.config.get<string>('SUPABASE_ANON_KEY')?.trim();
    const anonKey = !isPlaceholder(anonKeyRaw) ? anonKeyRaw : null;

    if (anonKey && supabaseUrl) {
      return this.validateWithSupabaseAuth(accessToken, supabaseUrl, anonKey);
    }

    this.logger.warn('Configuracao ausente para validar sessao Supabase.');
    throw new UnauthorizedException(
      'Configure SUPABASE_JWT_SECRET ou SUPABASE_ANON_KEY no backend para validar a sessao.',
    );
  }

  private validateWithJwtSecret(
    accessToken: string,
    secret: string,
    expectedIssuer: string,
  ): AuthUserContext {
    let decoded: string | jwt.JwtPayload;

    try {
      decoded = jwt.verify(accessToken, secret, {
        algorithms: ['HS256'],
        audience: 'authenticated',
        issuer: expectedIssuer,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao validar token com JWT secret: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
      throw new UnauthorizedException('Token Supabase invalido ou expirado.');
    }

    if (typeof decoded === 'string') {
      throw new UnauthorizedException('Payload do token em formato invalido.');
    }

    const payload = decoded as SupabaseJwtPayload;
    if (!payload.sub) {
      throw new UnauthorizedException('Token sem subject (sub).');
    }

    return {
      userId: payload.sub,
      email: payload.email ?? null,
      role: payload.role ?? null,
    };
  }

  private async validateWithSupabaseAuth(
    accessToken: string,
    supabaseUrl: string,
    anonKey: string,
  ): Promise<AuthUserContext> {
    let response: Response;

    try {
      response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: anonKey,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Falha de rede ao validar sessao no Supabase Auth: ${error instanceof Error ? error.message : 'erro desconhecido'}`,
      );
      throw new UnauthorizedException(
        'Nao foi possivel validar a sessao no Supabase Auth.',
      );
    }

    if (!response.ok) {
      this.logger.warn(
        `Supabase Auth rejeitou o token com status ${response.status}.`,
      );
      throw new UnauthorizedException('Token Supabase invalido ou expirado.');
    }

    const body = (await response.json()) as SupabaseUserResponse;
    if (!body.id) {
      throw new UnauthorizedException(
        'Resposta do Supabase Auth sem usuario valido.',
      );
    }

    return {
      userId: body.id,
      email: body.email ?? null,
      role: body.role ?? null,
    };
  }
}
