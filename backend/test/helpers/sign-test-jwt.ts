import * as jwt from 'jsonwebtoken';

export function signTestJwt(payload: {
  sub: string;
  email?: string;
  role?: string;
  emailConfirmedAt?: string | null;
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}): string {
  const secret = process.env.SUPABASE_JWT_SECRET!;
  const url = process.env.SUPABASE_URL!.replace(/\/$/, '');
  return jwt.sign(
    {
      sub: payload.sub,
      email:
        payload.email ??
        `e2e-${payload.sub.replace(/-/g, '').slice(0, 12)}@manucmms.local`,
      role: payload.role ?? 'authenticated',
      email_confirmed_at:
        payload.emailConfirmedAt ?? '2026-05-16T12:00:00.000Z',
      app_metadata: payload.appMetadata ?? undefined,
      user_metadata: payload.userMetadata ?? undefined,
    },
    secret,
    {
      algorithm: 'HS256',
      issuer: `${url}/auth/v1`,
      audience: 'authenticated',
      expiresIn: '15m',
    },
  );
}
