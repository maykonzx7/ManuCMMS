import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';

export function toUsuarioPublicResponse(
  usuario: UsuarioLocalContext,
): Omit<UsuarioLocalContext, 'authSub'> {
  const { authSub: _authSub, ...rest } = usuario;
  return rest;
}

export function maskApiKeyIntegracao(
  apiKey: string | null | undefined,
): string | null {
  if (!apiKey?.trim()) return null;
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `••••••••${trimmed.slice(-4)}`;
}
