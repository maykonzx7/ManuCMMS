import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';

export function resolveEffectiveUsuarioStatus(
  usuario: UsuarioLocalContext,
): string {
  const globalStatus = usuario.status?.trim().toUpperCase() ?? 'ATIVO';
  if (globalStatus === 'BLOQUEADO') {
    return 'BLOQUEADO';
  }
  return (
    usuario.statusMembros?.trim().toUpperCase() ??
    usuario.empresa?.statusMembros?.trim().toUpperCase() ??
    'ATIVO'
  );
}

export function toUsuarioPublicResponse(
  usuario: UsuarioLocalContext,
): Omit<UsuarioLocalContext, 'authSub'> {
  const { authSub: _authSub, ...rest } = usuario;
  return {
    ...rest,
    status: resolveEffectiveUsuarioStatus(usuario),
  };
}

export function maskApiKeyIntegracao(
  apiKey: string | null | undefined,
): string | null {
  if (!apiKey?.trim()) return null;
  const trimmed = apiKey.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `••••••••${trimmed.slice(-4)}`;
}
