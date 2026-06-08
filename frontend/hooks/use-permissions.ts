'use client'

import { useAuth } from '@/lib/auth'
import type { UserRole } from '@/types'
import { hasPermission as hasRolePermission } from '@/lib/permissions'

/**
 * Hook para verificar permissões do usuário atual
 */
export function usePermissions() {
  const { session, isPlatformOperator, isWorkspaceImpersonation } = useAuth()
  const role = session?.user?.perfil ?? 'TECNICO'

  const hasPermission = (screen: string) => {
    if (screen === 'platform') {
      return isPlatformOperator && !isWorkspaceImpersonation
    }
    if (screen === 'integracoes' || screen === 'iot') {
      return isPlatformOperator
    }
    return hasRolePermission(role, screen)
  }

  return {
    role,
    hasPermission,
    filterNavigation: <T extends { screen: string }>(items: T[]) =>
      items.filter((item) => hasPermission(item.screen)),
    canCreateOrder: ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role),
    canEditOrder: ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role),
    canManageOrderStatus: ['TECNICO', 'SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role),
    canManageAssets: ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role),
    canManageUsers: ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role),
    canViewAnalytics: ['GESTOR', 'AUDITOR', 'ADMIN'].includes(role),
    canViewExecutiveDashboard: ['GESTOR', 'ADMIN'].includes(role),
    isAdmin: role === 'ADMIN',
    isPlatformOperator,
    canAccessIntegrations: isPlatformOperator,
    canExportReports: ['GESTOR', 'AUDITOR', 'ADMIN'].includes(role),
  }
}

/**
 * Hook para verificar se o usuário pode acessar uma tela específica
 */
export function useCanAccess(screen: string): boolean {
  const { hasPermission } = usePermissions()
  return hasPermission(screen)
}
