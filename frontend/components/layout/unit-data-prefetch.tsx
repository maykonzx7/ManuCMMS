'use client'

import { useEffect, useRef } from 'react'
import { useAuth, useCurrentCompany, useCurrentUnit } from '@/lib/auth'
import { prefetchUnitModuleData } from '@/lib/api'

/**
 * Pré-carrega dados dos módulos mais acessados assim que a sessão e unidade estão prontas.
 */
export function UnitDataPrefetch() {
  const { accessToken } = useAuth()
  const currentUnit = useCurrentUnit()
  const company = useCurrentCompany()
  const lastPrefetchKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!accessToken || !currentUnit?.id) return

    const prefetchKey = `${currentUnit.id}:${company?.id ?? ''}`
    if (lastPrefetchKeyRef.current === prefetchKey) return
    lastPrefetchKeyRef.current = prefetchKey

    const extraPaths: string[] = []
    if (company?.id) {
      extraPaths.push(`/empresas/${company.id}/gestao/painel`)
    }

    prefetchUnitModuleData(currentUnit.id, accessToken, extraPaths)
  }, [accessToken, company?.id, currentUnit?.id])

  return null
}
