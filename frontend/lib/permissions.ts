import type { UserRole } from '@/types'
import { SCREEN_PERMISSIONS } from './constants'

/**
 * Verifica se um perfil tem acesso a uma tela específica
 */
export function hasPermission(role: UserRole, screen: string): boolean {
  const allowedRoles = SCREEN_PERMISSIONS[screen]
  if (!allowedRoles) return false
  return allowedRoles.includes(role)
}

/**
 * Filtra itens de navegação baseado no perfil do usuário
 */
export function filterNavigationByRole<T extends { screen: string }>(
  items: T[],
  role: UserRole
): T[] {
  return items.filter((item) => hasPermission(role, item.screen))
}

/**
 * Verifica se o usuário pode criar ordens de serviço
 */
export function canCreateOrder(role: UserRole): boolean {
  return ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role)
}

/**
 * Verifica se o usuário pode editar ordens de serviço
 */
export function canEditOrder(role: UserRole): boolean {
  return ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role)
}

/**
 * Verifica se o usuário pode iniciar/fechar ordens de serviço
 */
export function canManageOrderStatus(role: UserRole): boolean {
  return ['TECNICO', 'SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role)
}

/**
 * Verifica se o usuário pode criar/editar ativos
 */
export function canManageAssets(role: UserRole): boolean {
  return ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role)
}

/**
 * Verifica se o usuário pode gerenciar usuários
 */
export function canManageUsers(role: UserRole): boolean {
  return ['SUPERVISOR', 'GESTOR', 'ADMIN'].includes(role)
}

/**
 * Verifica se o usuário pode ver dados analíticos
 */
export function canViewAnalytics(role: UserRole): boolean {
  return ['GESTOR', 'AUDITOR', 'ADMIN'].includes(role)
}

/**
 * Verifica se o usuário é administrador
 */
export function isAdmin(role: UserRole): boolean {
  return role === 'ADMIN'
}

/**
 * Verifica se o usuário pode exportar relatórios
 */
export function canExportReports(role: UserRole): boolean {
  return ['GESTOR', 'AUDITOR', 'ADMIN'].includes(role)
}
