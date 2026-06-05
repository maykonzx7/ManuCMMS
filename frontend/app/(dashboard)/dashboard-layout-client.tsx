'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth'
import DashboardShell from '@/app/(dashboard)/dashboard-shell'

export function DashboardLayoutClient({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  )
}
