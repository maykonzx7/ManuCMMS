'use client'

import { Check, Circle, Camera, FileText, Play, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MaintenanceType, OrderStatus } from '@/types'

type StepState = 'done' | 'current' | 'pending'

type FlowStep = {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  state: StepState
}

type OsFlowProgressProps = {
  status: OrderStatus
  tipo: MaintenanceType
  hasFotoProblema?: boolean
  hasDescricaoProblema?: boolean
  hasDescricaoSolucao?: boolean
  hasFotoSolucao?: boolean
  hasConfirmacao?: boolean
}

function resolveSteps(props: OsFlowProgressProps): FlowStep[] {
  const isCorretiva = props.tipo === 'CORRETIVA'
  const isConcluida = props.status === 'CONCLUIDA'
  const isEmAndamento = props.status === 'EM_ANDAMENTO'
  const isAberta = props.status === 'ABERTA'
  const isAguardando = props.status === 'AGUARDANDO'

  const step = (id: string, label: string, icon: FlowStep['icon'], state: StepState): FlowStep => ({
    id,
    label,
    icon,
    state,
  })

  if (!isCorretiva) {
    return [
      step(
        'iniciar',
        'Iniciar',
        Play,
        isAguardando ? 'pending' : isAberta ? 'current' : 'done',
      ),
      step('execucao', 'Em execução', Circle, isEmAndamento ? 'current' : isConcluida ? 'done' : 'pending'),
      step('concluir', 'Concluir', ShieldCheck, isConcluida ? 'done' : isEmAndamento ? 'current' : 'pending'),
    ]
  }

  const iniciarDone = !isAberta
  const fotoProblemaDone = props.hasFotoProblema || iniciarDone
  const descricaoProblemaDone = props.hasDescricaoProblema || iniciarDone
  const resolucaoDone = props.hasDescricaoSolucao || isConcluida
  const fotoSolucaoDone = props.hasFotoSolucao || isConcluida
  const confirmacaoDone = props.hasConfirmacao || isConcluida

  let currentAssigned = false
  const resolveState = (done: boolean): StepState => {
    if (done) return 'done'
    if (!currentAssigned) {
      currentAssigned = true
      return 'current'
    }
    return 'pending'
  }

  return [
    step('iniciar', 'Iniciar OS', Play, resolveState(iniciarDone)),
    step('foto-problema', 'Foto do problema', Camera, resolveState(fotoProblemaDone)),
    step('descricao-problema', 'Descrever problema', FileText, resolveState(descricaoProblemaDone)),
    step('resolucao', 'Resolução', FileText, resolveState(resolucaoDone)),
    step('foto-solucao', 'Foto da resolução', Camera, resolveState(fotoSolucaoDone)),
    step('confirmar', 'Confirmar', ShieldCheck, resolveState(confirmacaoDone)),
  ]
}

export function OsFlowProgress(props: OsFlowProgressProps) {
  const steps = resolveSteps(props)

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="mb-3 text-sm font-medium text-muted-foreground">Fluxo de execução</p>
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map((item, index) => {
          const Icon = item.icon
          return (
            <li key={item.id} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  item.state === 'done' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600',
                  item.state === 'current' && 'border-primary/40 bg-primary/10 text-primary',
                  item.state === 'pending' && 'border-muted-foreground/20 text-muted-foreground',
                )}
              >
                {item.state === 'done' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                <span>{item.label}</span>
              </div>
              {index < steps.length - 1 ? (
                <span className="hidden text-muted-foreground sm:inline">→</span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
