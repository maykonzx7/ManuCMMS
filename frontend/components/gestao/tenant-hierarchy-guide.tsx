'use client'

import { ArrowRight, Building2, Factory, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  EMPRESA_FLOW_STEPS,
  ONBOARDING_FLOW_STEPS,
  TENANT_TERMS,
  type TenantHierarchyStep,
} from '@/lib/tenant-hierarchy'

type TenantHierarchyGuideProps = {
  variant: 'platform' | 'empresa'
  empresaNome?: string
}

function StepList({ steps }: { steps: TenantHierarchyStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.ordem} className="flex gap-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {step.ordem}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{step.titulo}</p>
            <p className="text-sm text-muted-foreground">{step.descricao}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Onde:</span> {step.onde}
              {' • '}
              <span className="font-medium text-foreground">Quem:</span> {step.quem}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function TenantHierarchyGuide({ variant, empresaNome }: TenantHierarchyGuideProps) {
  const steps = variant === 'platform' ? ONBOARDING_FLOW_STEPS : EMPRESA_FLOW_STEPS

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Cliente e unidade — qual a diferença?</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            <strong>Cliente</strong> é a empresa inteira no ManuCMMS.{' '}
            <strong>Unidade</strong> é cada planta ou filial dentro dessa empresa.
            Não crie um novo cliente para cada filial — crie <strong>unidades</strong> no
            cliente já existente.
          </p>
          {variant === 'empresa' && empresaNome ? (
            <p>
              Você está gerenciando o cliente <strong>{empresaNome}</strong>. Aqui você
              cadastra <strong>unidades</strong> e convida a equipe — não um novo cliente.
            </p>
          ) : null}
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {TENANT_TERMS.cliente.termo}
            </CardTitle>
            <CardDescription>{TENANT_TERMS.cliente.descricao}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Badge variant="secondary" className="mr-2">
                Sistema
              </Badge>
              {TENANT_TERMS.cliente.tecnico}
            </p>
            <p className="text-muted-foreground">Ex.: {TENANT_TERMS.cliente.exemplo}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Factory className="h-4 w-4" />
              {TENANT_TERMS.unidade.termo}
            </CardTitle>
            <CardDescription>{TENANT_TERMS.unidade.descricao}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <Badge variant="secondary" className="mr-2">
                Sistema
              </Badge>
              {TENANT_TERMS.unidade.tecnico}
            </p>
            <p className="text-muted-foreground">Ex.: {TENANT_TERMS.unidade.exemplo}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {variant === 'platform' ? 'Fluxo para novo cliente' : 'Próximos passos neste cliente'}
          </CardTitle>
          <CardDescription>
            {variant === 'platform' ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                Cliente <ArrowRight className="h-3 w-3" /> Unidade inicial (Matriz){' '}
                <ArrowRight className="h-3 w-3" /> Convite admin <ArrowRight className="h-3 w-3" />{' '}
                Unidades extras <ArrowRight className="h-3 w-3" /> Equipe
              </span>
            ) : (
              'Depois que o cliente já existe, use as etapas abaixo para estruturar filiais e usuários.'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StepList steps={steps} />
        </CardContent>
      </Card>
    </div>
  )
}
