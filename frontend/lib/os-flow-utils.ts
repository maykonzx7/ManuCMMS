import type { MaintenanceType, OrderStatus } from '@/types'

type OrdemFlowInput = {
  status: OrderStatus
  tipo: MaintenanceType
  fotoProblema?: string | null
  descricaoProblema?: string | null
}

export type PodeConcluirResult = {
  ok: boolean
  motivo: string | null
}

export function getPodeConcluirOrdem(input: OrdemFlowInput): PodeConcluirResult {
  if (input.status !== 'EM_ANDAMENTO') {
    return { ok: false, motivo: 'A OS precisa estar em andamento para ser concluída.' }
  }
  if (input.tipo === 'CORRETIVA') {
    if (!input.fotoProblema) {
      return {
        ok: false,
        motivo: 'Registre a foto do problema antes de concluir. Reinicie a OS se necessário.',
      }
    }
    if (!input.descricaoProblema?.trim()) {
      return {
        ok: false,
        motivo: 'A descrição do problema é obrigatória antes da conclusão.',
      }
    }
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
    const bloqueio = getPodeConcluirOrdem(input)
    if (!bloqueio.ok) {
      return {
        titulo: 'Conclusão bloqueada',
        descricao: bloqueio.motivo ?? 'Complete as etapas anteriores.',
        acao: null,
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
