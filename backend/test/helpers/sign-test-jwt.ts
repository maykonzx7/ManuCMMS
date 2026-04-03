import * as jwt from 'jsonwebtoken';

export function signTestJwt(payload: {
  sub: string;
  email?: string;
  role?: string;
}): string {
  const secret = process.env.SUPABASE_JWT_SECRET!;
  const url = process.env.SUPABASE_URL!.replace(/\/$/, '');
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email ?? 'teste@manucmms.local',
      role: payload.role ?? 'authenticated',
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
