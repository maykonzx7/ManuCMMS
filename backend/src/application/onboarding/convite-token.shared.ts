import { createHash } from 'node:crypto';

export function hashConviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function normalizeConviteToken(token: string | undefined) {
  return token?.trim() ?? '';
}
