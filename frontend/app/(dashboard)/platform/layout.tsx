'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageDataLoading } from '@/components/shared'
import { useAuth } from '@/lib/auth'
import { ROUTES } from '@/lib/routes'

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isLoading, isPlatformOperator } = useAuth()

  useEffect(() => {
    if (isLoading || isPlatformOperator) return
    router.replace(ROUTES.home)
  }, [isLoading, isPlatformOperator, router])

  if (isLoading || !isPlatformOperator) {
    return <PageDataLoading variant="dashboard" message="Verificando acesso à plataforma..." />
  }

  return children
}
