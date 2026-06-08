'use client'

import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { Crosshair, MapPin, X } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'

const DEFAULT_CENTER: [number, number] = [-15.78, -47.93]
const DEFAULT_ZOOM = 4
const SELECTED_ZOOM = 16

export type AssetMapCoords = {
  latitude: number | null
  longitude: number | null
}

type AssetLocationPickerProps = {
  value: AssetMapCoords
  onChange: (coords: AssetMapCoords) => void
  height?: string
  disabled?: boolean
}

function MapViewController({
  latitude,
  longitude,
}: {
  latitude: number | null
  longitude: number | null
}) {
  const map = useMap()

  useEffect(() => {
    if (latitude == null || longitude == null) return
    map.setView([latitude, longitude], SELECTED_ZOOM, { animate: true })
  }, [latitude, longitude, map])

  return null
}

function MapClickHandler({
  disabled,
  onSelect,
}: {
  disabled?: boolean
  onSelect: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click(event) {
      if (disabled) return
      onSelect(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

export function AssetLocationPicker({
  value,
  onChange,
  height = '320px',
  disabled = false,
}: AssetLocationPickerProps) {
  const hasCoords = value.latitude != null && value.longitude != null

  const center = useMemo<[number, number]>(
    () =>
      hasCoords
        ? [value.latitude!, value.longitude!]
        : DEFAULT_CENTER,
    [hasCoords, value.latitude, value.longitude],
  )

  const handleUseMyLocation = () => {
    if (disabled || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      () => {
        // Falha silenciosa — usuário pode clicar no mapa
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {hasCoords
            ? `Marcado em ${value.latitude!.toFixed(5)}, ${value.longitude!.toFixed(5)}`
            : 'Clique no mapa para marcar onde o ativo está instalado'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={handleUseMyLocation}
          >
            <Crosshair className="mr-2 h-4 w-4" />
            Minha posição
          </Button>
          {hasCoords ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange({ latitude: null, longitude: null })}
            >
              <X className="mr-2 h-4 w-4" />
              Limpar marcação
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border" style={{ height }}>
        <MapContainer
          center={center}
          zoom={hasCoords ? SELECTED_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom={!disabled}
          style={{ height: '100%', width: '100%', cursor: disabled ? 'default' : 'crosshair' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewController latitude={value.latitude} longitude={value.longitude} />
          <MapClickHandler
            disabled={disabled}
            onSelect={(latitude, longitude) => onChange({ latitude, longitude })}
          />
          {hasCoords ? (
            <CircleMarker
              center={[value.latitude!, value.longitude!]}
              radius={10}
              pathOptions={{
                color: '#1d4ed8',
                fillColor: '#3b82f6',
                fillOpacity: 0.9,
                weight: 3,
              }}
            />
          ) : null}
        </MapContainer>
      </div>

      {!hasCoords ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          A marcação no mapa é opcional, mas permite visualizar o ativo no mapa geral da unidade.
        </p>
      ) : null}
    </div>
  )
}
