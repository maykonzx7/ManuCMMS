import type { MaintenanceType, OrderStatus } from '@/types'

type OrdemFlowInput = {
  status: OrderStatus
  tipo: MaintenanceType
  fotoProblema?: string | null
  descricaoProblema?: string | null
}

export function normalizeOrderStatus(status: string): OrderStatus {
  const normalized = status.toUpperCase()
  return (normalized === 'EM_EXECUCAO' ? 'EM_ANDAMENTO' : normalized) as OrderStatus
}

export function ordemPrecisaEvidenciaProblema(input: OrdemFlowInput): boolean {
  if (input.tipo !== 'CORRETIVA') return false
  return !input.fotoProblema || !input.descricaoProblema?.trim()
}

export type PodeConcluirResult = {
  ok: boolean
  motivo: string | null
}

export function getPodeConcluirOrdem(input: OrdemFlowInput): PodeConcluirResult {
  if (input.status !== 'EM_ANDAMENTO') {
    return { ok: false, motivo: 'A OS precisa estar em andamento para ser concluída.' }
  }
  return { ok: true, motivo: null }
}

export function getProximoPassoMensagem(input: OrdemFlowInput): {
  titulo: string
  descricao: string
  acao: 'iniciar' | 'concluir' | null
} {
  if (input.status === 'ABERTA') {
    return {
      titulo: 'Próximo passo: iniciar a OS',
      descricao:
        input.tipo === 'CORRETIVA'
          ? 'Registre a foto e a descrição do problema antes de começar o reparo.'
          : 'Confirme o início da manutenção para registrar a execução.',
      acao: 'iniciar',
    }
  }
  if (input.status === 'EM_ANDAMENTO') {
    if (ordemPrecisaEvidenciaProblema(input)) {
      return {
        titulo: 'Próximo passo: evidência do problema',
        descricao:
          'Registre a foto e a descrição do defeito antes de finalizar a conclusão da OS.',
        acao: 'concluir',
      }
    }
    return {
      titulo: 'Próximo passo: concluir a OS',
      descricao:
        input.tipo === 'CORRETIVA'
          ? 'Descreva a resolução, anexe a foto da correção e confirme a conclusão.'
          : 'Descreva a intervenção, anexe a foto e confirme a conclusão.',
      acao: 'concluir',
    }
  }
  return { titulo: '', descricao: '', acao: null }
}
