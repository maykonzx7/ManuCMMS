'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar, AppHeader } from '@/components/layout'
import { UnitDataPrefetch } from '@/components/layout/unit-data-prefetch'
import { AuthLoadingScreen } from '@/components/auth'
import { useAuth, useCurrentCompany } from '@/lib/auth'
import { RealtimeProvider } from '@/lib/realtime-provider'
import { buildLoginRedirectUrl, resolveReturnPathFromBrowser } from '@/lib/safe-redirect'
import { isClientHandoffPath } from '@/lib/routes'

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, isSessionVerified, accessToken } = useAuth()
  const company = useCurrentCompany()
  const isClientHandoff = isClientHandoffPath(pathname)
  const hadVerifiedSessionRef = useRef(false)

  if (isSessionVerified) {
    hadVerifiedSessionRef.current = true
  }

  useEffect(() => {
    if (!isAuthenticated && !isLoading && !isSessionVerified) {
      hadVerifiedSessionRef.current = false
    }
  }, [isAuthenticated, isLoading, isSessionVerified])

  useEffect(() => {
    if (isClientHandoff || isLoading || isAuthenticated) return
    router.replace(buildLoginRedirectUrl(resolveReturnPathFromBrowser()))
  }, [isAuthenticated, isClientHandoff, isLoading, router])

  if (isClientHandoff) {
    return <>{children}</>
  }

  const showAuthGate = !hadVerifiedSessionRef.current && (isLoading || !isSessionVerified)

  if (showAuthGate) {
    return <AuthLoadingScreen message="Verificando sua sessão..." />
  }

  if (!isAuthenticated) {
    return <AuthLoadingScreen message="Redirecionando para o login..." />
  }

  return (
    <RealtimeProvider accessToken={accessToken} companySlug={company?.slug}>
      <SidebarProvider>
        <UnitDataPrefetch />
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </RealtimeProvider>
  )
}
