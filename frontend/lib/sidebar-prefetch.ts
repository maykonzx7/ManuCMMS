type PrefetchContext = {
  unitId?: string | null
  companyId?: string | null
}

/** Mapeia telas do menu para endpoints GET que a página carrega na entrada. */
export function resolveSidebarPrefetchPath(
  screen: string,
  context: PrefetchContext,
): string | null {
  const { unitId, companyId } = context

  switch (screen) {
    case 'home':
    case 'ordens-lista':
    case 'ordens-agenda':
    case 'dashboard':
      return unitId ? `/unidades/${unitId}/ordens-servico` : null
    case 'metricas':
      return unitId ? `/unidades/${unitId}/dashboard/executivo` : null
    case 'ativos-lista':
      return unitId ? `/unidades/${unitId}/ativos` : null
    case 'pecas-estoque':
      return unitId ? `/unidades/${unitId}/pecas` : null
    case 'usuarios':
      return unitId ? `/unidades/${unitId}/usuarios` : null
    case 'unidades':
      return '/unidades'
    case 'permissoes':
    case 'admin':
    case 'configuracoes':
      return companyId ? `/empresas/${companyId}/gestao/painel` : null
    case 'notificacoes':
      return '/notificacoes'
    case 'integracoes':
    case 'iot':
      return '/integracoes/status'
    case 'auditoria':
      return '/auditoria/resumo'
    default:
      return null
  }
}
