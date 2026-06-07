import type { UserRole, OrderStatus, MaintenanceType, Priority, AssetStatus } from '@/types'
import { ROUTES } from '@/lib/routes'

// ===========================================
// CONSTANTES DO SISTEMA
// ===========================================

export const APP_NAME = 'ManuCMMS'
export const APP_DESCRIPTION = 'Sistema de Gestão de Manutenção Industrial'

// ===========================================
// LABELS E OPÇÕES
// ===========================================

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  TECNICO: 'Técnico',
  SUPERVISOR: 'Supervisor',
  GESTOR: 'Gestor',
  AUDITOR: 'Auditor',
  ADMIN: 'Administrador',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  ABERTA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  EM_ANDAMENTO: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CONCLUIDA: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CANCELADA: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  CORRETIVA: 'Corretiva',
  PREVENTIVA: 'Preventiva',
  PREDITIVA: 'Preditiva',
}

export const MAINTENANCE_TYPE_COLORS: Record<MaintenanceType, string> = {
  CORRETIVA: 'bg-red-500/20 text-red-400 border-red-500/30',
  PREVENTIVA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PREDITIVA: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  BAIXA: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  MEDIA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ALTA: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CRITICA: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  EM_MANUTENCAO: 'Em Manutenção',
  DESATIVADO: 'Desativado',
}

export const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  ATIVO: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  INATIVO: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  EM_MANUTENCAO: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DESATIVADO: 'bg-red-500/20 text-red-400 border-red-500/30',
}

// ===========================================
// OPÇÕES PARA SELECT
// ===========================================

export const USER_ROLE_OPTIONS = Object.entries(USER_ROLE_LABELS).map(([value, label]) => ({
  value: value as UserRole,
  label,
}))

export const ORDER_STATUS_OPTIONS = Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
  value: value as OrderStatus,
  label,
}))

export const MAINTENANCE_TYPE_OPTIONS = Object.entries(MAINTENANCE_TYPE_LABELS).map(([value, label]) => ({
  value: value as MaintenanceType,
  label,
}))

export const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
  value: value as Priority,
  label,
}))

export const ASSET_STATUS_OPTIONS = Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => ({
  value: value as AssetStatus,
  label,
}))

// ===========================================
// PERMISSÕES POR TELA
// ===========================================

type ScreenPermissions = Record<string, UserRole[]>

export const SCREEN_PERMISSIONS: ScreenPermissions = {
  // Telas acessíveis a todos
  home: ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN'],
  'ordens-lista': ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN'],
  'ordens-agenda': ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN'],
  'ativos-lista': ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN'],
  
  // Telas restritas
  'ordens-detalhe': ['TECNICO', 'SUPERVISOR', 'GESTOR', 'ADMIN'],
  'ativos-cadastro': ['SUPERVISOR', 'GESTOR', 'ADMIN'],
  'pecas-estoque': ['SUPERVISOR', 'GESTOR', 'ADMIN'],
  usuarios: ['SUPERVISOR', 'GESTOR', 'ADMIN'],
  unidades: ['SUPERVISOR', 'GESTOR', 'ADMIN'],
  dashboard: ['GESTOR', 'ADMIN'],
  auditoria: ['GESTOR', 'AUDITOR', 'ADMIN'],
  notificacoes: ['SUPERVISOR', 'GESTOR', 'ADMIN'],
  relatorios: ['GESTOR', 'AUDITOR', 'ADMIN'],
  integracoes: ['GESTOR', 'ADMIN'],
  iot: ['ADMIN'],
  admin: ['ADMIN'],
  metricas: ['ADMIN'],
  permissoes: ['GESTOR', 'ADMIN'],
  configuracoes: ['SUPERVISOR', 'GESTOR', 'ADMIN'],
}

// ===========================================
// NAVEGAÇÃO DA SIDEBAR
// ===========================================

export const SIDEBAR_NAVIGATION = [
  {
    title: 'Principal',
    items: [
      { title: 'Início', url: ROUTES.home, icon: 'Home', screen: 'home' },
      { title: 'Ordens de Serviço', url: ROUTES.ordens, icon: 'ClipboardList', screen: 'ordens-lista' },
      { title: 'Agenda / Kanban', url: ROUTES.ordensAgenda, icon: 'CalendarDays', screen: 'ordens-agenda' },
      { title: 'Ativos', url: ROUTES.ativos, icon: 'Package', screen: 'ativos-lista' },
      { title: 'Peças / Estoque', url: ROUTES.pecas, icon: 'Boxes', screen: 'pecas-estoque' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { title: 'Usuários', url: '/workspace/usuarios', icon: 'Users', screen: 'usuarios' },
      { title: 'Unidades', url: '/workspace/unidades', icon: 'Building2', screen: 'unidades' },
      { title: 'Permissões', url: '/workspace/permissoes', icon: 'Shield', screen: 'permissoes' },
      { title: 'Painel Admin', url: ROUTES.admin, icon: 'Shield', screen: 'admin' },
    ],
  },
  {
    title: 'Análises',
    items: [
      { title: 'Dashboard', url: '/workspace/dashboard', icon: 'BarChart3', screen: 'dashboard' },
      { title: 'Métricas Admin', url: ROUTES.metricas, icon: 'LineChart', screen: 'metricas' },
      { title: 'Relatórios', url: '/workspace/relatorios', icon: 'FileText', screen: 'relatorios' },
      { title: 'Auditoria', url: '/workspace/auditoria', icon: 'History', screen: 'auditoria' },
    ],
  },
  {
    title: 'Plataforma',
    items: [
      { title: 'Painel Plataforma', url: ROUTES.platform, icon: 'Globe', screen: 'platform' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { title: 'Notificações', url: '/workspace/notificacoes', icon: 'Bell', screen: 'notificacoes' },
      { title: 'Integrações', url: '/workspace/integracoes', icon: 'Plug', screen: 'integracoes' },
      { title: 'IoT', url: '/workspace/iot', icon: 'Cpu', screen: 'iot' },
      { title: 'Configurações', url: ROUTES.configuracoes, icon: 'Settings', screen: 'configuracoes' },
    ],
  },
]
