'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar, AppHeader } from '@/components/layout'
import { UnitDataPrefetch } from '@/components/layout/unit-data-prefetch'
import { useAuth, useCurrentCompany } from '@/lib/auth'
import { RealtimeProvider } from '@/lib/realtime-provider'
import { buildLoginRedirectUrl, resolveReturnPathFromBrowser } from '@/lib/safe-redirect'
import { isClientHandoffPath } from '@/lib/routes'

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { accessToken, isLoading } = useAuth()
  const company = useCurrentCompany()
  const isClientHandoff = isClientHandoffPath(pathname)

  useEffect(() => {
    if (isClientHandoff || isLoading || accessToken) return
    router.replace(buildLoginRedirectUrl(resolveReturnPathFromBrowser()))
  }, [accessToken, isClientHandoff, isLoading, router])

  if (isClientHandoff) {
    return <>{children}</>
  }

  if (!accessToken) {
    if (isLoading) return null
    return null
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
