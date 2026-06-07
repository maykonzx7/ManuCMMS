'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar, AppHeader } from '@/components/layout'
import { AuthLoadingScreen } from '@/components/auth'
import { useAuth } from '@/lib/auth'
import { buildLoginRedirectUrl, resolveReturnPathFromBrowser } from '@/lib/safe-redirect'
import { ROUTES, isClientHandoffPath } from '@/lib/routes'

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, isLoading, isSessionVerified } = useAuth()
  const isClientHandoff = isClientHandoffPath(pathname)

  useEffect(() => {
    if (isClientHandoff || isLoading || isAuthenticated) return
    router.replace(buildLoginRedirectUrl(resolveReturnPathFromBrowser()))
  }, [isAuthenticated, isClientHandoff, isLoading, router])

  if (isClientHandoff) {
    return <>{children}</>
  }

  if (isLoading || !isSessionVerified) {
    return <AuthLoadingScreen message="Verificando sua sessão..." />
  }

  if (!isAuthenticated) {
    return <AuthLoadingScreen message="Redirecionando para o login..." />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
