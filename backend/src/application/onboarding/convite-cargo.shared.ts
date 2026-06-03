import type { PerfilUsuarioCodigo } from '../../domain/ports/usuario-read.port';

export const PERFIS_CONVITE: PerfilUsuarioCodigo[] = [
  'TECNICO',
  'SUPERVISOR',
  'GESTOR',
  'AUDITOR',
  'ADMIN',
];

const PERFIL_HIERARCHY: Record<PerfilUsuarioCodigo, number> = {
  TECNICO: 10,
  SUPERVISOR: 20,
  GESTOR: 30,
  AUDITOR: 40,
  ADMIN: 50,
};

export type EmpresaCargoConvite = {
  codigo: string;
  nome: string;
  nivelHierarquico: number;
};

export function isPerfilConvite(
  codigo: string | null | undefined,
): codigo is PerfilUsuarioCodigo {
  const normalized = (codigo ?? '').trim().toUpperCase();
  return PERFIS_CONVITE.includes(normalized as PerfilUsuarioCodigo);
}

export function mapNivelToPerfil(nivel: number): PerfilUsuarioCodigo {
  let best: PerfilUsuarioCodigo = 'TECNICO';
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const perfil of PERFIS_CONVITE) {
    const distance = Math.abs(PERFIL_HIERARCHY[perfil] - nivel);
    if (
      distance < bestDistance ||
      (distance === bestDistance &&
        PERFIL_HIERARCHY[perfil] < PERFIL_HIERARCHY[best])
    ) {
      best = perfil;
      bestDistance = distance;
    }
  }

  return best;
}

export function resolvePerfilFromCargo(
  cargoCodigo: string,
  empresaCargo?: EmpresaCargoConvite | null,
): PerfilUsuarioCodigo {
  const normalized = cargoCodigo.trim().toUpperCase();
  if (isPerfilConvite(normalized)) {
    return normalized;
  }

  if (!empresaCargo) {
    throw new Error(`Cargo da empresa nao encontrado para codigo ${normalized}.`);
  }

  if (isPerfilConvite(empresaCargo.codigo)) {
    return empresaCargo.codigo.trim().toUpperCase() as PerfilUsuarioCodigo;
  }

  return mapNivelToPerfil(empresaCargo.nivelHierarquico);
}
