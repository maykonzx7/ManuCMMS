'use client'

import type { ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth'

export function AuthShell({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
