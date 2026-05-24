// ===========================================
// TIPOS BASE DO SISTEMA MANUCMMS
// ===========================================

// Perfis de usuário
export type UserRole = 'TECNICO' | 'SUPERVISOR' | 'GESTOR' | 'AUDITOR' | 'ADMIN'

// Status de Ordem de Serviço
export type OrderStatus = 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'

// Tipo de manutenção
export type MaintenanceType = 'CORRETIVA' | 'PREVENTIVA' | 'PREDITIVA'

// Prioridade
export type Priority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'

// Status de ativo
export type AssetStatus = 'ATIVO' | 'INATIVO' | 'EM_MANUTENCAO' | 'DESATIVADO'

// ===========================================
// ENTIDADES PRINCIPAIS
// ===========================================

export interface User {
  id: string
  nome: string
  email: string
  avatar?: string
  perfil: UserRole
  ativo: boolean
  empresaId: string
  unidadeId?: string
  createdAt: string
  updatedAt: string
}

export interface Company {
  id: string
  nome: string
  slug: string
  logo?: string
  plano: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  ativo: boolean
  createdAt: string
}

export interface Unit {
  id: string
  nome: string
  codigo: string
  endereco?: string
  cidade?: string
  estado?: string
  empresaId: string
  ativo: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    ativos: number
    usuarios: number
    ordensServico: number
  }
}

export interface Asset {
  id: string
  nome: string
  codigo: string
  descricao?: string
  localizacao?: string
  fabricante?: string
  modelo?: string
  numeroSerie?: string
  dataAquisicao?: string
  status: AssetStatus
  unidadeId: string
  unidade?: Unit
  createdAt: string
  updatedAt: string
  _count?: {
    ordensServico: number
  }
}

export interface ServiceOrder {
  id: string
  numero: string
  titulo: string
  descricao?: string
  tipo: MaintenanceType
  prioridade: Priority
  status: OrderStatus
  dataAbertura: string
  dataInicio?: string
  dataFechamento?: string
  observacoes?: string
  solucao?: string
  ativoId: string
  ativo?: Asset
  unidadeId: string
  unidade?: Unit
  solicitanteId: string
  solicitante?: User
  responsavelId?: string
  responsavel?: User
  fotos?: ServiceOrderPhoto[]
  historico?: ServiceOrderHistory[]
  createdAt: string
  updatedAt: string
}

export interface ServiceOrderPhoto {
  id: string
  url: string
  descricao?: string
  ordemServicoId: string
  createdAt: string
}

export interface ServiceOrderHistory {
  id: string
  acao: string
  descricao?: string
  ordemServicoId: string
  usuarioId: string
  usuario?: User
  createdAt: string
}

export interface AuditLog {
  id: string
  acao: string
  entidade: string
  entidadeId: string
  dadosAntigos?: Record<string, unknown>
  dadosNovos?: Record<string, unknown>
  usuarioId: string
  usuario?: User
  ip?: string
  createdAt: string
}

export interface Notification {
  id: string
  titulo: string
  mensagem: string
  tipo: 'INFO' | 'ALERTA' | 'URGENTE'
  lida: boolean
  usuarioId: string
  createdAt: string
}

export interface Integration {
  id: string
  nome: string
  tipo: 'ERP' | 'IOT' | 'EMAIL' | 'SMS' | 'WEBHOOK'
  status: 'ATIVO' | 'INATIVO' | 'ERRO'
  ultimaSincronizacao?: string
  configuracao?: Record<string, unknown>
  empresaId: string
  createdAt: string
}

// ===========================================
// TIPOS DE API
// ===========================================

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface LoginRequest {
  email: string
  senha: string
  empresaSlug?: string
}

export interface LoginResponse {
  accessToken: string
  user: User
  empresa: Company
  unidades: Unit[]
}

export interface SessionData {
  user: User
  empresa: Company
  unidades: Unit[]
  unidadeAtual?: Unit
  isPlatformOperator?: boolean
}

// ===========================================
// TIPOS DE DASHBOARD
// ===========================================

export interface DashboardKPIs {
  totalAtivos: number
  ativosEmManutencao: number
  ordensAbertas: number
  ordensEmAndamento: number
  ordensConcluidas: number
  mttr: number // Mean Time To Repair
  mtbf: number // Mean Time Between Failures
  taxaDisponibilidade: number
}

export interface ChartData {
  name: string
  value: number
  [key: string]: string | number
}

// ===========================================
// TIPOS DE FORMULÁRIO
// ===========================================

export interface AssetFormData {
  nome: string
  codigo: string
  descricao?: string
  localizacao?: string
  fabricante?: string
  modelo?: string
  numeroSerie?: string
  dataAquisicao?: string
  status: AssetStatus
}

export interface ServiceOrderFormData {
  titulo: string
  descricao?: string
  tipo: MaintenanceType
  prioridade: Priority
  ativoId: string
  responsavelId?: string
}

export interface UserInviteFormData {
  email: string
  nome: string
  perfil: UserRole
  unidadeId?: string
}

// ===========================================
// TIPOS DE FILTRO
// ===========================================

export interface OrderFilters {
  status?: OrderStatus
  tipo?: MaintenanceType
  prioridade?: Priority
  ativoId?: string
  responsavelId?: string
  dataInicio?: string
  dataFim?: string
  busca?: string
}

export interface AssetFilters {
  status?: AssetStatus
  busca?: string
}

export interface AuditFilters {
  entidade?: string
  usuarioId?: string
  dataInicio?: string
  dataFim?: string
}
