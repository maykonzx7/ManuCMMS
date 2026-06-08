'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plug, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Link as LinkIcon, KeyRound, Webhook, Copy } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth, useCurrentCompany } from '@/lib/auth'
import { apiRequest, isApiCacheWarm } from '@/lib/api'
import { toast } from 'sonner'
import { PageDataLoading } from '@/components/shared'

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

type IntegracaoEmpresaResponse = {
  webhookUrl: string | null
  apiKeyIntegracao: string | null
  circuitBreakerAberto: boolean
  eventosRecentes: Array<{
    id: string
    tipo: string
    status: string
    tentativas: number
    ultimoErro: string | null
    entregueEm: string | null
    createdAt: string
  }>
}

const labels: Record<keyof IntegracoesStatusResponse['integrations'], string> = {
  rabbitmq: 'RabbitMQ',
  mongodb: 'MongoDB (Auditoria)',
  redis: 'Redis',
  smtp: 'Email (Brevo API / SMTP)',
  iot: 'Gateway IoT',
}

export default function IntegracoesPage() {
  const { accessToken } = useAuth()
  const company = useCurrentCompany()
  const [data, setData] = useState<IntegracoesStatusResponse | null>(null)
  const [integracao, setIntegracao] = useState<IntegracaoEmpresaResponse | null>(null)
  const [revealedApiKey, setRevealedApiKey] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    if (!accessToken) return
    if (!isApiCacheWarm('/integracoes/status', accessToken)) {
      setIsLoading(true)
    }
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

  const loadIntegracao = async () => {
    if (!accessToken || !company?.id) return
    try {
      const response = await apiRequest<IntegracaoEmpresaResponse>(
        `/empresas/${company.id}/gestao/integracao`,
        { accessToken },
      )
      setIntegracao(response)
      setWebhookUrl(response.webhookUrl ?? '')
      setRevealedApiKey(null)
    } catch {
      setIntegracao(null)
      setRevealedApiKey(null)
    }
  }

  useEffect(() => {
    void load()
    void loadIntegracao()
  }, [accessToken, company?.id])

  const items = useMemo(() => {
    if (!data) return []
    return (Object.keys(data.integrations) as Array<keyof IntegracoesStatusResponse['integrations']>).map((key) => ({
      key,
      label: labels[key],
      ...data.integrations[key],
    }))
  }, [data])

  const okCount = items.filter((item) => item.ok).length

  const saveWebhook = async () => {
    if (!accessToken || !company?.id) return
    setSavingWebhook(true)
    try {
      const response = await apiRequest<IntegracaoEmpresaResponse>(
        `/empresas/${company.id}/gestao/integracao`,
        {
          method: 'PATCH',
          accessToken,
          body: { webhookUrl: webhookUrl.trim() || null },
        },
      )
      setIntegracao(response)
      setWebhookUrl(response.webhookUrl ?? '')
      toast.success('Webhook atualizado.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar webhook')
    } finally {
      setSavingWebhook(false)
    }
  }

  const regenerateApiKey = async () => {
    if (!accessToken || !company?.id) return
    try {
      const response = await apiRequest<IntegracaoEmpresaResponse>(
        `/empresas/${company.id}/gestao/integracao/regenerar-api-key`,
        { method: 'POST', accessToken },
      )
      setIntegracao(response)
      setRevealedApiKey(response.apiKeyIntegracao)
      toast.success('Nova API key gerada. Copie agora — ela não será exibida novamente.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao regenerar API key')
    }
  }

  const testWebhook = async () => {
    if (!accessToken || !company?.id) return
    try {
      const response = await apiRequest<{ ok: boolean; message: string }>(
        `/empresas/${company.id}/gestao/integracao/testar-webhook`,
        { method: 'POST', accessToken },
      )
      if (response.ok) {
        toast.success(response.message)
      } else {
        toast.error(response.message)
      }
      await loadIntegracao()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao testar webhook')
    }
  }

  const copyApiKey = async () => {
    const key = revealedApiKey ?? integracao?.apiKeyIntegracao
    if (!key || key.startsWith('••••')) {
      toast.error('Gere uma nova API key para copiar o valor completo.')
      return
    }
    await navigator.clipboard.writeText(key)
    toast.success('API key copiada.')
  }

  const displayedApiKey =
    revealedApiKey ??
    integracao?.apiKeyIntegracao ??
    'Gere uma chave para habilitar a API'

  if (isLoading && !data) {
    return <PageDataLoading variant="cards" message="Carregando integrações..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">Status dos serviços e configuração de interoperabilidade</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isLoading || !accessToken}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook outbound
          </CardTitle>
          <CardDescription>
            Eventos assíncronos após fechamento de OS. Header de autenticação via API key (fase posterior).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL do webhook</Label>
            <Input
              id="webhook-url"
              placeholder="https://seu-sistema.com/webhooks/manucmms"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void saveWebhook()} disabled={savingWebhook || !company?.id}>
              Salvar webhook
            </Button>
            <Button variant="outline" onClick={() => void testWebhook()} disabled={!company?.id}>
              Testar webhook
            </Button>
            {integracao?.circuitBreakerAberto ? (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Circuit breaker aberto
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                Circuit breaker fechado
              </Badge>
            )}
          </div>

          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              <Label>API key de parceiro</Label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={displayedApiKey} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void copyApiKey()} disabled={!revealedApiKey}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
                <Button variant="outline" onClick={() => void regenerateApiKey()} disabled={!company?.id}>
                  Regenerar
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use o header <code>x-api-key</code> em <code>GET /api/v1/integracao/unidades/:id/ordens-servico</code>
            </p>
          </div>

          {integracao?.eventosRecentes?.length ? (
            <div className="space-y-2">
              <Label>Eventos recentes</Label>
              <div className="space-y-2">
                {integracao.eventosRecentes.map((evento) => (
                  <div key={evento.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{evento.tipo}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(evento.createdAt).toLocaleString('pt-BR')}
                        {evento.ultimoErro ? ` — ${evento.ultimoErro}` : ''}
                      </p>
                    </div>
                    <Badge variant="outline">{evento.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

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
