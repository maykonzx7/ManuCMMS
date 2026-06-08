"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cpu, RefreshCw, CheckCircle2, AlertTriangle, WifiOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { ROUTES } from '@/lib/routes'
import { PageDataLoading } from '@/components/shared'

type ApiAtivo = {
  idAtivo: string
  nome: string
  status: string
  tag?: string | null
}

type IntegracoesStatusResponse = {
  integrations: {
    iot: {
      ok: boolean
      message: string
    }
  }
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

  const load = async () => {
    if (!accessToken || !unit?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const [statusRes, ativosRes] = await Promise.all([
        apiRequest<IntegracoesStatusResponse>('/integracoes/status', { accessToken }),
        apiRequest<ApiAtivo[]>(`/unidades/${unit.id}/ativos`, { accessToken }),
      ])
      setIotOk(statusRes.integrations.iot.ok)
      setIotMessage(statusRes.integrations.iot.message)
      setAtivos(ativosRes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar dados de IoT')
      setAtivos([])
      setIotOk(null)
      setIotMessage('')
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
          <p className="text-muted-foreground">Status do gateway e ativos monitorados na unidade atual</p>
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
              {ativos.map((ativo) => (
                <div key={ativo.idAtivo} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{ativo.nome}</p>
                    <p className="text-xs text-muted-foreground">{ativo.tag || ativo.idAtivo}</p>
                  </div>
                  {(ativo.status ?? '').toUpperCase() === 'MANUTENCAO' ? (
                    <Badge variant="outline" className="border-amber-500 text-amber-500"><AlertTriangle className="mr-1 h-3 w-3" /> Manutenção</Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500 text-emerald-500"><CheckCircle2 className="mr-1 h-3 w-3" /> Operacional</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
