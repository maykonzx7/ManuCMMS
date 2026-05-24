'use client'

import { useAuth } from '@/lib/auth'
import type { UserRole } from '@/types'
import { hasPermission, filterNavigationByRole } from '@/lib/permissions'

/**
 * Hook para verificar permissões do usuário atual
 */
export function usePermissions() {
  const { session } = useAuth()
  const role = session?.user?.perfil ?? 'TECNICO'

  return {
    role,
    hasPermission: (screen: string) => hasPermission(role, screen),
    filterNavigation: <T extends { screen: string }>(items: T[]) =>
      filterNavigationByRole(items, role),
    canCreateOrder: ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role),
    canEditOrder: ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role),
    canManageOrderStatus: ['TECNICO', 'SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role),
    canManageAssets: ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role),
    canManageUsers: ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role),
    canViewAnalytics: ['GESTOR', 'AUDITOR', 'ADMIN'].includes(role),
    isAdmin: role === 'ADMIN',
    canExportReports: ['GESTOR', 'AUDITOR', 'ADMIN'].includes(role),
  }
}

/**
 * Hook para verificar se o usuário pode acessar uma tela específica
 */
export function useCanAccess(screen: string): boolean {
  const { session } = useAuth()
  if (!session?.user) return false
  return hasPermission(session.user.perfil, screen)
}
