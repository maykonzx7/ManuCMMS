'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { ROUTES } from '@/lib/routes'

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { accessToken, isPlatformOperator } = useAuth()

  useEffect(() => {
    if (accessToken && !isPlatformOperator) {
      router.replace(ROUTES.home)
    }
  }, [accessToken, isPlatformOperator, router])

  if (!isPlatformOperator) {
    return null
  }

  return children
}
