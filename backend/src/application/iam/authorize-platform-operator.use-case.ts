import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUserContext } from '../../presentation/auth/auth-user.types';

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function parseEnabled(value: string | undefined): boolean {
  const normalized = normalize(value);
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

const BREAK_GLASS_PLATFORM_EMAILS = new Set([
  'maykon011games@gmial.com',
  'maykon011games@gmail.com',
]);

@Injectable()
export class AuthorizePlatformOperatorUseCase {
  constructor(private readonly config: ConfigService) {}

  execute(user: AuthUserContext): void {
    if (!user?.userId) {
      throw new ForbiddenException('Sessao de usuario invalida.');
    }
    if (!user.emailConfirmedAt) {
      throw new ForbiddenException(
        'Confirme seu email antes de operar o onboarding da plataforma.',
      );
    }

    if (this.hasPlatformOwnerClaim(user)) {
      return;
    }

    const allowEmailFallback = parseEnabled(
      this.config.get<string>('PLATFORM_ALLOW_EMAIL_FALLBACK'),
    );
    if (!allowEmailFallback) {
      throw new ForbiddenException('Acesso restrito ao operador da plataforma.');
    }

    const allowed = this.parseAllowedEmails();
    const actorEmail = normalize(user.email);
    const isBreakGlass = actorEmail ? BREAK_GLASS_PLATFORM_EMAILS.has(actorEmail) : false;
    if (!actorEmail || (!allowed.has(actorEmail) && !isBreakGlass)) {
      throw new ForbiddenException('Acesso restrito ao operador da plataforma.');
    }
  }

  private hasPlatformOwnerClaim(user: AuthUserContext): boolean {
    return (
      this.readBoolean(user.appMetadata, 'platform_owner') ||
      this.readBoolean(user.appMetadata, 'platformOwner') ||
      this.readBoolean(user.userMetadata, 'platform_owner') ||
      this.readBoolean(user.userMetadata, 'platformOwner')
    );
  }

  private readBoolean(
    source: Record<string, unknown> | null,
    field: string,
  ): boolean {
    if (!source || !(field in source)) {
      return false;
    }
    const value = source[field];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return parseEnabled(value);
    return false;
  }

  private parseAllowedEmails(): Set<string> {
    const configured = this.config.get<string>('PLATFORM_OWNER_EMAILS')?.trim();
    if (!configured) {
      throw new InternalServerErrorException(
        'PLATFORM_OWNER_EMAILS nao configurada para fallback de onboarding da plataforma.',
      );
    }

    const allowed = new Set(
      configured
        .split(',')
        .map((item) => normalize(item))
        .filter(Boolean),
    );
    if (allowed.size === 0) {
      throw new InternalServerErrorException(
        'PLATFORM_OWNER_EMAILS nao possui emails validos para fallback.',
      );
    }
    return allowed;
  }
}
