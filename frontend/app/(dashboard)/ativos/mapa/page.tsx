'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, MapPin, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageDataLoading } from '@/components/shared'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { mapApiAtivoToAsset, type ApiAtivo } from '@/lib/backend-mappers'
import { ASSET_STATUS_COLORS, ASSET_STATUS_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { AssetMapPin } from '@/components/ativos/asset-location-map'

const AssetLocationMap = dynamic(
  () =>
    import('@/components/ativos/asset-location-map').then((m) => m.AssetLocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[480px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Carregando mapa...
      </div>
    ),
  },
)

export default function AtivosMapaPage() {
  const { accessToken } = useAuth()
  const unit = useCurrentUnit()
  const [ativos, setAtivos] = useState<ReturnType<typeof mapApiAtivoToAsset>[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken || !unit?.id) return
    setIsLoading(true)
    void apiRequest<ApiAtivo[]>(`/unidades/${unit.id}/ativos`, { accessToken })
      .then((res) => {
        setAtivos(res.map((item) => mapApiAtivoToAsset(item, unit.id)))
        setError(null)
      })
      .catch((e) => {
        setAtivos([])
        setError(e instanceof Error ? e.message : 'Falha ao carregar ativos')
      })
      .finally(() => setIsLoading(false))
  }, [accessToken, unit?.id])

  const pins = useMemo<AssetMapPin[]>(
    () =>
      ativos
        .filter((a) => typeof a.latitude === 'number' && typeof a.longitude === 'number')
        .map((a) => ({
          id: a.id,
          nome: a.nome,
          codigo: a.codigo,
          latitude: a.latitude!,
          longitude: a.longitude!,
          status: a.status,
          localizacao: a.localizacao,
        })),
    [ativos],
  )

  const ativosSemCoordenadas = ativos.filter((a) => a.latitude == null)

  const selected = ativos.find((a) => a.id === selectedId) ?? null

  if (isLoading) {
    return <PageDataLoading variant="list" message="Carregando mapa de ativos..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/ativos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mapa de Ativos</h1>
            <p className="text-sm text-muted-foreground">
              {pins.length} com coordenadas · {ativos.length} total na unidade
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localização geográfica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssetLocationMap
                pins={pins}
                height="480px"
                selectedId={selectedId}
                onPinClick={setSelectedId}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {selected ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{selected.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Tag: </span>
                    {selected.codigo}
                  </p>
                  {selected.localizacao ? (
                    <p>
                      <span className="text-muted-foreground">Local: </span>
                      {selected.localizacao}
                    </p>
                  ) : null}
                  <Badge
                    variant="outline"
                    className={cn('text-xs', ASSET_STATUS_COLORS[selected.status])}
                  >
                    {ASSET_STATUS_LABELS[selected.status]}
                  </Badge>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/ativos/${selected.id}`}>Ver detalhes</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {ativosSemCoordenadas.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sem coordenadas</CardTitle>
                </CardHeader>
                <CardContent className="max-h-[320px] space-y-2 overflow-y-auto">
                  {ativosSemCoordenadas.map((ativo) => (
                    <div
                      key={ativo.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{ativo.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ativo.localizacao || 'Sem localização cadastrada'}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/ativos/${ativo.id}/editar`}>Editar</Link>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {pins.length === 0 && ativos.length > 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                  <Package className="h-8 w-8 opacity-50" />
                  <p>Marque a posição dos ativos no mapa ao cadastrar ou editar para exibi-los aqui.</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
