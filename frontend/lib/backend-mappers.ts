import type { Asset, ServiceOrder, Unit, User } from '@/types'

export type ApiAtivo = {
  id?: string
  idAtivo?: string
  idUnidade?: string
  nome: string
  status: string
  limiteTemp: number
  tag?: string | null
  fabricante?: string | null
  modelo?: string | null
  numeroSerie?: string | null
  observacoes?: string | null
}

export type ApiOrdem = {
  id?: string
  idOrdemServico?: string
  idAtivo?: string
  ativoId?: string
  idTecnico?: string | null
  ativoNome: string
  status: string
  tipo: string
  descricao: string
  dataAbertura: string
  dataFechamento?: string | null
}

export type ApiUsuario = {
  id?: string
  idUsuario?: string
  nome: string
  email: string
  perfil: string
  status?: string
}

export type ApiUnidade = {
  id?: string
  idUnidade?: string
  nome: string
  localizacao: string
  status?: string
}

export function mapApiAtivoToAsset(input: ApiAtivo, unidadeId: string): Asset {
  const id = input.id ?? input.idAtivo ?? `tmp-asset-${Math.random().toString(36).slice(2, 10)}`
  const normalizedStatus = input.status?.toUpperCase() ?? 'OPERACIONAL'
  const status: Asset['status'] =
    normalizedStatus === 'MANUTENCAO'
      ? 'EM_MANUTENCAO'
      : normalizedStatus === 'INATIVO'
        ? 'INATIVO'
        : normalizedStatus === 'FALHA'
          ? 'DESATIVADO'
          : 'ATIVO'

  return {
    id,
    nome: input.nome,
    codigo: input.tag?.trim() || id.slice(0, 8).toUpperCase(),
    descricao: input.observacoes ?? undefined,
    localizacao: undefined,
    fabricante: input.fabricante ?? undefined,
    modelo: input.modelo ?? undefined,
    numeroSerie: input.numeroSerie ?? undefined,
    status,
    unidadeId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { ordensServico: 0 },
  }
}

export function mapApiOrdemToServiceOrder(input: ApiOrdem, unidadeId: string): ServiceOrder {
  const id = input.id ?? input.idOrdemServico ?? `tmp-order-${Math.random().toString(36).slice(2, 10)}`
  const ativoId = input.idAtivo ?? input.ativoId ?? ''
  const normalizedStatus = input.status?.toUpperCase() ?? 'ABERTA'
  const status = normalizedStatus === 'EM_EXECUCAO' ? 'EM_ANDAMENTO' : normalizedStatus
  return {
    id,
    numero: id.slice(0, 8).toUpperCase(),
    titulo: input.descricao,
    descricao: input.descricao,
    tipo: (input.tipo?.toUpperCase() ?? 'CORRETIVA') as ServiceOrder['tipo'],
    prioridade: 'MEDIA',
    status: status as ServiceOrder['status'],
    dataAbertura: input.dataAbertura,
    dataFechamento: input.dataFechamento ?? undefined,
    ativoId,
    unidadeId,
    solicitanteId: '',
    responsavelId: input.idTecnico ?? undefined,
    createdAt: input.dataAbertura,
    updatedAt: input.dataFechamento ?? input.dataAbertura,
    ativo: input.ativoNome
      ? {
          id: ativoId,
          nome: input.ativoNome,
          codigo: ativoId.slice(0, 8).toUpperCase(),
          status: 'ATIVO',
          unidadeId,
          createdAt: input.dataAbertura,
          updatedAt: input.dataAbertura,
        }
      : undefined,
  }
}

export function mapApiUsuarioToUser(input: ApiUsuario, empresaId: string, unidadeId: string): User {
  const id = input.id ?? input.idUsuario ?? `tmp-user-${Math.random().toString(36).slice(2, 10)}`
  return {
    id,
    nome: input.nome,
    email: input.email,
    perfil: (input.perfil?.toUpperCase() ?? 'TECNICO') as User['perfil'],
    ativo: (input.status ?? 'ATIVO').toUpperCase() === 'ATIVO',
    empresaId,
    unidadeId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function mapApiUnidadeToUnit(input: ApiUnidade, empresaId: string): Unit {
  const id = input.id ?? input.idUnidade ?? ''
  const normalizedStatus = (input.status ?? 'ATIVA').toUpperCase()
  return {
    id,
    nome: input.nome,
    codigo: input.localizacao || id.slice(0, 8).toUpperCase(),
    endereco: input.localizacao || undefined,
    empresaId,
    ativo: normalizedStatus !== 'INATIVA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: { ativos: 0, usuarios: 0, ordensServico: 0 },
  }
}
