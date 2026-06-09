import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';

const PERFIS_VISAO_EMPRESA = new Set(['ADMIN', 'GESTOR', 'SUPERVISOR']);

export function usuarioTemVisaoEmpresa(
  usuarioLocal: UsuarioLocalContext,
): boolean {
  return PERFIS_VISAO_EMPRESA.has(
    usuarioLocal.perfil?.trim().toUpperCase() ?? '',
  );
}

export function usuarioTemEscopoCorporativo(
  usuarioLocal: UsuarioLocalContext,
): boolean {
  return usuarioLocal.cargos.some((cargo) => cargo.idUnidade == null);
}

export function buildUnidadeIdsAutorizadas(
  usuarioLocal: UsuarioLocalContext,
): Set<string> {
  return new Set([
    usuarioLocal.idUnidade,
    ...usuarioLocal.cargos
      .map((cargo) => cargo.idUnidade)
      .filter((value): value is string => Boolean(value)),
  ]);
}

export function usuarioPodeAcessarUnidade(
  usuarioLocal: UsuarioLocalContext,
  unidadeId: string,
  unidadeEmpresaId?: string | null,
): boolean {
  if (
    usuarioLocal.empresa?.id &&
    unidadeEmpresaId &&
    unidadeEmpresaId !== usuarioLocal.empresa.id
  ) {
    return false;
  }

  if (
    (usuarioTemVisaoEmpresa(usuarioLocal) ||
      usuarioTemEscopoCorporativo(usuarioLocal)) &&
    usuarioLocal.empresa?.id &&
    unidadeEmpresaId === usuarioLocal.empresa.id
  ) {
    return true;
  }

  return buildUnidadeIdsAutorizadas(usuarioLocal).has(unidadeId);
}
