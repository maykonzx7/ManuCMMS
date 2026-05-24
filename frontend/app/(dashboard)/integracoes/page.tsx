"use client"

import { useEffect, useMemo, useState } from 'react'
import { Plug, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Link as LinkIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

type IntegrationStatus = {
  ok: boolean
  message: string
}

type IntegracoesStatusResponse = {
  status: 'ok' | 'degraded'
  checkedAt: string
  integrations: {
    rabbitmq: IntegrationStatus
    mongodb: IntegrationStatus
    redis: IntegrationStatus
    smtp: IntegrationStatus
    iot: IntegrationStatus
  }
}

const labels: Record<keyof IntegracoesStatusResponse['integrations'], string> = {
  rabbitmq: 'RabbitMQ',
  mongodb: 'MongoDB (Auditoria)',
  redis: 'Redis',
  smtp: 'SMTP (Email)',
  iot: 'Gateway IoT',
}

export default function IntegracoesPage() {
  const { accessToken } = useAuth()
  const [data, setData] = useState<IntegracoesStatusResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiRequest<IntegracoesStatusResponse>('/integracoes/status', { accessToken })
      setData(response)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : 'Falha ao consultar integrações')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [accessToken])

  const items = useMemo(() => {
    if (!data) return []
    return (Object.keys(data.integrations) as Array<keyof IntegracoesStatusResponse['integrations']>).map((key) => ({
      key,
      label: labels[key],
      ...data.integrations[key],
    }))
  }, [data])

  const okCount = items.filter((item) => item.ok).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">Status real dos serviços integrados ao backend</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isLoading || !accessToken}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Serviços OK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{okCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Serviços com falha</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.max(items.length - okCount, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Última verificação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {data?.checkedAt ? new Date(data.checkedAt).toLocaleString('pt-BR') : 'Sem dados'}
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{item.label}</CardTitle>
                {item.ok ? (
                  <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Online
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-rose-500 text-rose-500">
                    <XCircle className="mr-1 h-3 w-3" /> Indisponível
                  </Badge>
                )}
              </div>
              <CardDescription className="pt-1">{item.message}</CardDescription>
            </CardHeader>
            <CardContent className="pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                {item.ok ? <LinkIcon className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                Estado reportado pela API
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isLoading && !error && items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <Plug className="mx-auto mb-2 h-6 w-6" />
            Não foi possível carregar integrações neste momento.
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
