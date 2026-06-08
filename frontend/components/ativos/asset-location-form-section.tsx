'use client'

import dynamic from 'next/dynamic'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { AssetMapCoords } from '@/components/ativos/asset-location-picker'

const AssetLocationPicker = dynamic(
  () =>
    import('@/components/ativos/asset-location-picker').then((m) => m.AssetLocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Carregando mapa...
      </div>
    ),
  },
)

const LOCALIZACAO_PLACEHOLDER =
  'Ex.: São Paulo, Bloco C, Linha 2, Setor de Embalagem'

type AssetLocationFormSectionProps = {
  localizacao: string
  onLocalizacaoChange: (value: string) => void
  mapCoords: AssetMapCoords
  onMapCoordsChange: (coords: AssetMapCoords) => void
  disabled?: boolean
}

export function AssetLocationFormSection({
  localizacao,
  onLocalizacaoChange,
  mapCoords,
  onMapCoordsChange,
  disabled = false,
}: AssetLocationFormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Localização do Ativo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="localizacao-ativo">Descrição da localização</Label>
          <Input
            id="localizacao-ativo"
            value={localizacao}
            onChange={(e) => onLocalizacaoChange(e.target.value)}
            placeholder={LOCALIZACAO_PLACEHOLDER}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Informe cidade, bloco, linha, setor, sala ou qualquer referência interna da planta.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Posição no mapa</Label>
          <AssetLocationPicker
            value={mapCoords}
            onChange={onMapCoordsChange}
            disabled={disabled}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export { LOCALIZACAO_PLACEHOLDER }
