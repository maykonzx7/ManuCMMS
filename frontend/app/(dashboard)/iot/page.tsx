"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Cloud,
  Copy,
  FlaskConical,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import { PageDataLoading } from '@/components/shared'

type ApiAtivo = {
  id?: string
  idAtivo?: string
  nome: string
  status: string
  tag?: string | null
  limiteTemp?: number
}

type IotCloudInfo = {
  configured: boolean
  ingestionUrl: string | null
  leiturasUrl: string | null
  cloudLeiturasUrl: string | null
  simularUrl: string | null
  apiKeyRequired: boolean
  authHeader: string
  payloadExample: { ativoId: string; valor: number }
  cloudPayloadExample: { ativoId: string; field1: number }
  bridgeStatus: 'manual' | 'not_configured'
  cloudPlatforms: {
    thingSpeak: string
    adafruitIo: string
  }
  flow: string[]
}

type IntegracoesStatusResponse = {
  integrations: {
    iot: {
      ok: boolean
      message: string
    }
  }
}

type SimularIotResponse = {
  ativoId: string
  ativoNome: string
  valor: number
  limiteTemp: number
  leiturasEnviadas: number
  leiturasConsecutivasAcimaLimite: number
  osPreditivaPublicada: boolean
  correlationId: string
}

function resolveAtivoId(ativo: ApiAtivo): string {
  return ativo.idAtivo ?? ativo.id ?? ''
}

export default function IotPage() {
  const router = useRouter()
  const { accessToken, isPlatformOperator } = useAuth()
  const unit = useCurrentUnit()
  const [ativos, setAtivos] = useState<ApiAtivo[]>([])
  const [iotOk, setIotOk] = useState<boolean | null>(null)
  const [iotMessage, setIotMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [simulatingAtivoId, setSimulatingAtivoId] = useState<string | null>(null)
  const [iotInfo, setIotInfo] = useState<IotCloudInfo | null>(null)

  const load = async () => {
    if (!accessToken || !unit?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const [statusRes, ativosRes, infoRes] = await Promise.all([
        apiRequest<IntegracoesStatusResponse>('/integracoes/status', { accessToken }),
        apiRequest<ApiAtivo[]>(`/unidades/${unit.id}/ativos`, { accessToken }),
        apiRequest<IotCloudInfo>('/integracoes/iot/info', { accessToken }),
      ])
      setIotOk(statusRes.integrations.iot.ok)
      setIotMessage(statusRes.integrations.iot.message)
      setAtivos(ativosRes)
      setIotInfo(infoRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados de IoT')
      setAtivos([])
      setIotOk(null)
      setIotMessage('')
      setIotInfo(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken) return
    if (!isPlatformOperator) {
      router.replace(ROUTES.home)
      return
    }
    void load()
  }, [accessToken, isPlatformOperator, router, unit?.id])

  const handleSimular = async (ativo: ApiAtivo) => {
    const ativoId = resolveAtivoId(ativo)
    if (!accessToken || !unit?.id || !ativoId) return

    if ((ativo.status ?? '').toUpperCase() === 'MANUTENCAO') {
      toast.error('Ativo em manutenção — finalize a OS atual antes de simular.')
      return
    }

    setSimulatingAtivoId(ativoId)
    try {
      const result = await apiRequest<SimularIotResponse>('/integracoes/iot/simular', {
        accessToken,
        method: 'POST',
        body: {
          idUnidade: unit.id,
          idAtivo: ativoId,
        },
      })

      if (result.osPreditivaPublicada) {
        toast.success(
          `OS preditiva disparada para ${result.ativoNome}. Verifique em Ordens de Serviço.`,
        )
      } else {
        toast.info(
          `Leituras enviadas (${result.leiturasEnviadas}x ${result.valor}°C). Aguardando RN-01 completar.`,
        )
      }

      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao simular leitura IoT')
    } finally {
      setSimulatingAtivoId(null)
    }
  }

  if (!isPlatformOperator) {
    return null
  }

  const ativosEmManutencao = useMemo(
    () => ativos.filter((item) => (item.status ?? '').toUpperCase() === 'MANUTENCAO').length,
    [ativos],
  )

  if (isLoading && ativos.length === 0 && iotOk === null) {
    return <PageDataLoading variant="cards" message="Carregando monitoramento IoT..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoramento IoT</h1>
          <p className="text-muted-foreground">
            Status do gateway, ativos monitorados e simulação de alerta térmico (RN-01)
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={isLoading || !accessToken || !unit?.id}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Gateway IoT</CardTitle></CardHeader>
          <CardContent>
            {iotOk === true ? (
              <Badge variant="outline" className="border-emerald-500 text-emerald-500"><CheckCircle2 className="mr-1 h-3 w-3" /> Online</Badge>
            ) : iotOk === false ? (
              <Badge variant="outline" className="border-rose-500 text-rose-500"><WifiOff className="mr-1 h-3 w-3" /> Offline</Badge>
            ) : (
              <span className="text-sm text-muted-foreground">Sem leitura</span>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{iotMessage || 'Aguardando consulta da API.'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ativos na unidade</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{ativos.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ativos em manutenção</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{ativosEmManutencao}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Integração IoT na nuvem
          </CardTitle>
          <CardDescription>
            ThingSpeak / Adafruit IO → gateway ManuCMMS (ponte manual via HTTP)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!iotInfo?.configured ? (
            <p className="text-muted-foreground">
              IOT_INGESTION_URL não configurada no backend. Em produção aponta para o serviço
              Render manucmms-iot-ingestion.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-sky-500 text-sky-600">
                  Ponte: {iotInfo.bridgeStatus === 'manual' ? 'manual (webhook/script)' : 'não configurada'}
                </Badge>
                {iotInfo.apiKeyRequired ? (
                  <Badge variant="outline">Header {iotInfo.authHeader} obrigatório</Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                    Sem API key (dev)
                  </Badge>
                )}
              </div>

              <div className="space-y-2 rounded-md border bg-muted/30 p-3 font-mono text-xs">
                <p>
                  <span className="text-muted-foreground">Leituras reais:</span>{' '}
                  {iotInfo.leiturasUrl}
                </p>
                <p>
                  <span className="text-muted-foreground">Cloud (ThingSpeak/Adafruit):</span>{' '}
                  {iotInfo.cloudLeiturasUrl}
                </p>
              </div>

              <div className="space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">ThingSpeak:</strong> {iotInfo.cloudPlatforms.thingSpeak}</p>
                <p><strong className="text-foreground">Adafruit IO:</strong> {iotInfo.cloudPlatforms.adafruitIo}</p>
              </div>

              <div>
                <p className="mb-2 font-medium">Payload de exemplo</p>
                <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
                  {JSON.stringify(iotInfo.cloudPayloadExample, null, 2)}
                </pre>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      JSON.stringify(iotInfo.cloudPayloadExample, null, 2),
                    )
                    toast.success('Payload copiado')
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar payload
                </Button>
              </div>

              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                {iotInfo.flow.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Demonstração RN-01
          </CardTitle>
          <CardDescription>
            Simula 3 leituras consecutivas acima do limite térmico. O worker cria uma OS preditiva
            automaticamente e atribui a um técnico livre da unidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Após a simulação, confira a nova OS em{' '}
            <Link href="/ordens" className="underline underline-offset-2">
              Ordens de Serviço
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" /> Ativos monitorados</CardTitle>
          <CardDescription>Dados reais do backend para a unidade selecionada</CardDescription>
        </CardHeader>
        <CardContent>
          {ativos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum ativo encontrado para monitoramento.</p>
          ) : (
            <div className="space-y-2">
              {ativos.map((ativo) => {
                const ativoId = resolveAtivoId(ativo)
                const emManutencao = (ativo.status ?? '').toUpperCase() === 'MANUTENCAO'
                const isSimulating = simulatingAtivoId === ativoId

                return (
                  <div key={ativoId} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{ativo.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {ativo.tag || ativoId}
                        {typeof ativo.limiteTemp === 'number' ? ` · limite ${ativo.limiteTemp}°C` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {emManutencao ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-500">
                          <AlertTriangle className="mr-1 h-3 w-3" /> Manutenção
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Operacional
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!iotOk || emManutencao || isSimulating || !unit?.id}
                        onClick={() => void handleSimular(ativo)}
                      >
                        {isSimulating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Simulando...
                          </>
                        ) : (
                          <>
                            <FlaskConical className="mr-2 h-4 w-4" />
                            Simular alerta
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
