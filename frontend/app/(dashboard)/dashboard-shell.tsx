'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar, AppHeader } from '@/components/layout'
import { AuthLoadingScreen } from '@/components/auth'
import { useAuth } from '@/lib/auth'
import { buildLoginRedirectUrl, resolveReturnPathFromBrowser } from '@/lib/safe-redirect'

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(buildLoginRedirectUrl(resolveReturnPathFromBrowser()))
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
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
