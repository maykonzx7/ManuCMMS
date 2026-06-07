'use client'

import { ArrowRight, Building2, Factory } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  EMPRESA_FLOW_STEPS,
  ONBOARDING_FLOW_STEPS,
  TENANT_TERMS,
  type TenantHierarchyStep,
} from '@/lib/tenant-hierarchy'

type TenantHierarchyHelpProps = {
  variant: 'platform' | 'empresa'
  empresaNome?: string
}

function StepList({ steps }: { steps: TenantHierarchyStep[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step) => (
        <li key={step.ordem} className="flex gap-2 rounded-md border bg-muted/20 p-2 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {step.ordem}
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium">{step.titulo}</p>
            <p className="text-xs text-muted-foreground">{step.descricao}</p>
            <p className="text-xs text-muted-foreground">
              {step.onde} · {step.quem}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function TenantHierarchyHelp({ variant, empresaNome }: TenantHierarchyHelpProps) {
  const steps = variant === 'platform' ? ONBOARDING_FLOW_STEPS : EMPRESA_FLOW_STEPS

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full text-sm font-semibold"
          aria-label="Cliente e unidade — qual a diferença?"
        >
          ?
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[min(80vh,32rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto p-4">
        <div className="space-y-4">
          <div>
            <p className="font-semibold">Cliente e unidade — qual a diferença?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              <strong>Cliente</strong> é a empresa inteira no ManuCMMS.{' '}
              <strong>Unidade</strong> é cada planta ou filial dentro dela.
              Não crie um cliente por filial — crie <strong>unidades</strong> no cliente existente.
            </p>
            {variant === 'empresa' && empresaNome ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Cliente atual: <strong>{empresaNome}</strong>. Aqui você gerencia unidades e equipe.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border p-2 text-sm">
              <p className="flex items-center gap-1 font-medium">
                <Building2 className="h-3.5 w-3.5" />
                {TENANT_TERMS.cliente.termo}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{TENANT_TERMS.cliente.descricao}</p>
              <Badge variant="secondary" className="mt-2 text-[10px]">
                {TENANT_TERMS.cliente.tecnico}
              </Badge>
            </div>
            <div className="rounded-md border p-2 text-sm">
              <p className="flex items-center gap-1 font-medium">
                <Factory className="h-3.5 w-3.5" />
                {TENANT_TERMS.unidade.termo}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{TENANT_TERMS.unidade.descricao}</p>
              <Badge variant="secondary" className="mt-2 text-[10px]">
                {TENANT_TERMS.unidade.tecnico}
              </Badge>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">
              {variant === 'platform' ? 'Fluxo para novo cliente' : 'Próximos passos'}
            </p>
            {variant === 'platform' ? (
              <p className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                Cliente <ArrowRight className="h-3 w-3" /> Matriz{' '}
                <ArrowRight className="h-3 w-3" /> Convite <ArrowRight className="h-3 w-3" /> Unidades{' '}
                <ArrowRight className="h-3 w-3" /> Equipe
              </p>
            ) : null}
            <StepList steps={steps} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
