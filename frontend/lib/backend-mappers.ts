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
  custoHoraParada?: number
  custoManutencaoMensal?: number
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
  prioridade?: string
  descricao: string
  fotoAnexo?: string | null
  fotoProblema?: string | null
  descricaoProblema?: string | null
  fotoSolucao?: string | null
  descricaoSolucao?: string | null
  dataLimiteSla?: string | null
  statusSla?: 'NO_PRAZO' | 'ATRASADA' | 'CONCLUIDA'
  assinaturaDigital?: string | null
  dataAbertura: string
  dataFechamento?: string | null
  idCriadoPorUsuario?: string | null
  criadoPorNome?: string | null
  idIniciadoPorUsuario?: string | null
  iniciadoPorNome?: string | null
  idFinalizadoPorUsuario?: string | null
  finalizadoPorNome?: string | null
  transferencias?: Array<{
    id: string
    deTecnicoId?: string | null
    deTecnicoNome?: string | null
    paraTecnicoId: string
    paraTecnicoNome?: string | null
    transferidoPorUsuarioId: string
    transferidoPorNome?: string | null
    motivo: string
    createdAt: string
  }>
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
    solucao: input.descricaoSolucao ?? undefined,
    tipo: (input.tipo?.toUpperCase() ?? 'CORRETIVA') as ServiceOrder['tipo'],
    prioridade: (input.prioridade?.toUpperCase() ?? 'MEDIA') as ServiceOrder['prioridade'],
    status: status as ServiceOrder['status'],
    dataAbertura: input.dataAbertura,
    dataFechamento: input.dataFechamento ?? undefined,
    ativoId,
    unidadeId,
    solicitanteId: input.idCriadoPorUsuario ?? '',
    solicitante: input.idCriadoPorUsuario
      ? {
          id: input.idCriadoPorUsuario,
          nome: input.criadoPorNome ?? 'Usuário',
          email: '',
          perfil: 'TECNICO',
          ativo: true,
          empresaId: '',
          createdAt: input.dataAbertura,
          updatedAt: input.dataAbertura,
        }
      : undefined,
    responsavelId: input.idTecnico ?? undefined,
    responsavel: input.idTecnico
      ? {
          id: input.idTecnico,
          nome: input.finalizadoPorNome ?? input.iniciadoPorNome ?? 'Técnico',
          email: '',
          perfil: 'TECNICO',
          ativo: true,
          empresaId: '',
          createdAt: input.dataAbertura,
          updatedAt: input.dataAbertura,
        }
      : undefined,
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
    historico:
      input.transferencias?.map((t) => ({
        id: t.id,
        acao: 'TRANSFERENCIA',
        descricao: `Transferida de ${t.deTecnicoNome ?? 'não atribuído'} para ${t.paraTecnicoNome ?? 'técnico'} por ${t.transferidoPorNome ?? 'usuário'}. Motivo: ${t.motivo}`,
        ordemServicoId: id,
        usuarioId: t.transferidoPorUsuarioId,
        createdAt: t.createdAt,
      })) ?? [],
    fotos: [
      input.fotoProblema
        ? {
            id: `${id}-foto-problema`,
            url: input.fotoProblema,
            descricao: 'Foto do problema',
            ordemServicoId: id,
            createdAt: input.dataAbertura,
          }
        : null,
      input.fotoSolucao
        ? {
            id: `${id}-foto-solucao`,
            url: input.fotoSolucao,
            descricao: 'Foto da solução',
            ordemServicoId: id,
            createdAt: input.dataFechamento ?? input.dataAbertura,
          }
        : null,
      input.fotoAnexo
        ? {
            id: `${id}-foto-anexo`,
            url: input.fotoAnexo,
            descricao: 'Foto da intervenção',
            ordemServicoId: id,
            createdAt: input.dataFechamento ?? input.dataAbertura,
          }
        : null,
    ].filter(Boolean) as ServiceOrder['fotos'],
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
