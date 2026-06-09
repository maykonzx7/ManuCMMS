'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Package, Thermometer, Tag, Factory, Boxes, Hash, FileText, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest, apiRequestWithFallback } from '@/lib/api'
import {
  mapApiAtivoToAsset,
  mapApiOrdemToServiceOrder,
  type ApiAtivo,
  type ApiAtivoDocumento,
  type ApiOrdem,
} from '@/lib/backend-mappers'
import { ASSET_STATUS_COLORS, ASSET_STATUS_LABELS, MAINTENANCE_TYPE_LABELS, ORDER_STATUS_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { PageDataLoading } from '@/components/shared'
import { AssetDocumentsPanel } from '@/components/ativos/asset-documents-panel'
import { AssetPhotoSection } from '@/components/ativos/asset-photo-section'
import { usePermissions } from '@/hooks/use-permissions'
import type { AssetMapPin } from '@/components/ativos/asset-location-map'

const MAP_HEIGHT = '480px'

const AssetLocationMap = dynamic(
  () =>
    import('@/components/ativos/asset-location-map').then((m) => m.AssetLocationMap),
  { ssr: false, loading: () => <div className="h-[480px] animate-pulse rounded-lg bg-muted" /> },
)

type ApiAtivoDetalhe = ApiAtivo

export default function AssetDetailPage() {
  const params = useParams()
  const { accessToken } = useAuth()
  const unit = useCurrentUnit()
  const { canManageAssets } = usePermissions()
  const [asset, setAsset] = useState<ReturnType<typeof mapApiAtivoToAsset> | null>(null)
  const [historico, setHistorico] = useState<ReturnType<typeof mapApiOrdemToServiceOrder>[]>([])
  const [documentos, setDocumentos] = useState<ApiAtivoDocumento[]>([])
  const [mapAssets, setMapAssets] = useState<ReturnType<typeof mapApiAtivoToAsset>[]>([])
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPageLoading, setIsPageLoading] = useState(true)

  const load = async () => {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    setIsPageLoading(true)
    try {
      const [res, ordensRes, docsRes, allAtivosRes] = await Promise.all([
        apiRequest<ApiAtivoDetalhe>(`/unidades/${unit.id}/ativos/${params.id}`, { accessToken }),
        apiRequest<ApiOrdem[]>(`/unidades/${unit.id}/ativos/${params.id}/ordens-servico`, { accessToken }),
        apiRequestWithFallback<ApiAtivoDocumento[]>(
          `/unidades/${unit.id}/ativos/${params.id}/documentos`,
          [],
          { accessToken },
        ),
        apiRequest<ApiAtivo[]>(`/unidades/${unit.id}/ativos`, { accessToken }),
      ])
      setAsset(mapApiAtivoToAsset(res, unit.id))
      setMapAssets(allAtivosRes.map((item) => mapApiAtivoToAsset(item, unit.id)))
      setSelectedMapId(params.id)
      setHistorico(ordensRes.map((item) => mapApiOrdemToServiceOrder(item, unit.id)))
      setDocumentos(docsRes)
      setError(null)
    } catch (e) {
      setAsset(null)
      setHistorico([])
      setDocumentos([])
      setError(e instanceof Error ? e.message : 'Falha ao carregar ativo')
    } finally {
      setIsPageLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [accessToken, unit?.id, params.id])

  const mapPins = useMemo<AssetMapPin[]>(
    () =>
      mapAssets
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
    [mapAssets],
  )

  const selectedMapIndex = useMemo(
    () => mapPins.findIndex((pin) => pin.id === selectedMapId),
    [mapPins, selectedMapId],
  )

  const selectedMapAsset = useMemo(
    () => mapAssets.find((a) => a.id === selectedMapId) ?? asset,
    [mapAssets, selectedMapId, asset],
  )

  const navigateMapPin = (direction: 'prev' | 'next') => {
    if (mapPins.length === 0) return
    const current = selectedMapIndex >= 0 ? selectedMapIndex : 0
    const nextIndex =
      direction === 'next'
        ? (current + 1) % mapPins.length
        : (current - 1 + mapPins.length) % mapPins.length
    setSelectedMapId(mapPins[nextIndex].id)
  }

  if (isPageLoading) {
    return <PageDataLoading variant="detail" message="Carregando ativo..." />
  }

  if (!asset) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/ativos"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {error || 'Ativo não encontrado.'}
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasCoords = asset.latitude != null && asset.longitude != null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/ativos"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{asset.nome}</h1>
            <p className="text-sm text-muted-foreground">{asset.codigo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/ativos/mapa">Mapa</Link>
          </Button>
          <Button asChild>
            <Link href={`/ativos/${asset.id}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />Editar
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Ativo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <AssetPhotoSection
            className="w-full shrink-0 lg:w-[min(100%,440px)]"
            unidadeId={unit!.id}
            ativoId={asset.id}
            accessToken={accessToken!}
            fotoUrl={asset.fotoUrl}
            canManage={canManageAssets}
            onChange={(fotoUrl) =>
              setAsset((prev) => (prev ? { ...prev, fotoUrl: fotoUrl ?? undefined } : prev))
            }
          />
          <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm"><Package className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Nome:</span><span>{asset.nome}</span></div>
          <div className="flex items-center gap-2 text-sm"><Tag className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Tag/Código:</span><span>{asset.codigo}</span></div>
          <div className="flex items-center gap-2 text-sm"><Factory className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Fabricante:</span><span>{asset.fabricante || '-'}</span></div>
          <div className="flex items-center gap-2 text-sm"><Boxes className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Modelo:</span><span>{asset.modelo || '-'}</span></div>
          <div className="flex items-center gap-2 text-sm"><Hash className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Número de série:</span><span>{asset.numeroSerie || '-'}</span></div>
          <div className="flex items-center gap-2 text-sm"><Thermometer className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Status:</span><Badge variant="outline" className={cn('text-xs', ASSET_STATUS_COLORS[asset.status])}>{ASSET_STATUS_LABELS[asset.status]}</Badge></div>
          <div className="flex items-center gap-2 text-sm sm:col-span-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Localização:</span><span>{asset.localizacao || '-'}</span></div>
          <div className="sm:col-span-2 flex items-start gap-2 text-sm"><FileText className="mt-0.5 h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Observações:</span><span>{asset.descricao || '-'}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa do Ativo
          </CardTitle>
          {hasCoords && mapPins.length > 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selectedMapIndex >= 0 ? selectedMapIndex + 1 : 1} de {mapPins.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateMapPin('prev')}
                aria-label="Ativo anterior no mapa"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateMapPin('next')}
                aria-label="Próximo ativo no mapa"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent>
          {hasCoords ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <AssetLocationMap
                pins={mapPins.length > 0 ? mapPins : [{
                  id: asset.id,
                  nome: asset.nome,
                  codigo: asset.codigo,
                  latitude: asset.latitude!,
                  longitude: asset.longitude!,
                  status: asset.status,
                  localizacao: asset.localizacao,
                }]}
                height={MAP_HEIGHT}
                selectedId={selectedMapId ?? asset.id}
                onPinClick={setSelectedMapId}
              />
              {selectedMapAsset ? (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-4 text-sm">
                  <div>
                    <p className="font-medium">{selectedMapAsset.nome}</p>
                    <p className="text-xs text-muted-foreground">{selectedMapAsset.codigo}</p>
                  </div>
                  {selectedMapAsset.localizacao ? (
                    <p>
                      <span className="text-muted-foreground">Local: </span>
                      {selectedMapAsset.localizacao}
                    </p>
                  ) : null}
                  <Badge
                    variant="outline"
                    className={cn('text-xs', ASSET_STATUS_COLORS[selectedMapAsset.status])}
                  >
                    {ASSET_STATUS_LABELS[selectedMapAsset.status]}
                  </Badge>
                  {selectedMapAsset.id !== asset.id ? (
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={`/ativos/${selectedMapAsset.id}`}>Abrir este ativo</Link>
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Ativo em visualização</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/20 py-8 text-center text-sm text-muted-foreground">
              <p>Este ativo ainda não foi marcado no mapa.</p>
              {canManageAssets ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/ativos/${asset.id}/editar`}>Marcar localização no mapa</Link>
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {unit?.id && accessToken ? (
        <AssetDocumentsPanel
          unidadeId={unit.id}
          ativoId={asset.id}
          accessToken={accessToken}
          documentos={documentos}
          canManage={canManageAssets}
          onChange={() => void load()}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Manutenção</CardTitle>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ordem de serviço registrada para este ativo.</p>
          ) : (
            <div className="space-y-3">
              {historico.map((ordem) => (
                <div key={ordem.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{ordem.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {MAINTENANCE_TYPE_LABELS[ordem.tipo]} · {ORDER_STATUS_LABELS[ordem.status]} · {new Date(ordem.dataAbertura).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/ordens/${ordem.id}`}>Ver OS</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
