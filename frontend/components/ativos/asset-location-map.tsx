'use client'

import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export type AssetMapPin = {
  id: string
  nome: string
  codigo?: string
  latitude: number
  longitude: number
  status?: string
  localizacao?: string | null
}

type AssetLocationMapProps = {
  pins: AssetMapPin[]
  center?: [number, number]
  zoom?: number
  height?: string
  onPinClick?: (id: string) => void
  selectedId?: string | null
}

function FitBounds({ pins }: { pins: AssetMapPin[] }) {
  const map = useMap()

  useEffect(() => {
    if (pins.length === 0) return
    if (pins.length === 1) {
      map.setView([pins[0].latitude, pins[0].longitude], 15)
      return
    }
    const lats = pins.map((p) => p.latitude)
    const lngs = pins.map((p) => p.longitude)
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ]
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [map, pins])

  return null
}

const STATUS_COLORS: Record<string, string> = {
  ATIVO: '#22c55e',
  EM_MANUTENCAO: '#f59e0b',
  DESATIVADO: '#ef4444',
  INATIVO: '#94a3b8',
}

export function AssetLocationMap({
  pins,
  center = [-15.78, -47.93],
  zoom = 4,
  height = '360px',
  onPinClick,
  selectedId,
}: AssetLocationMapProps) {
  if (pins.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground"
        style={{ height }}
      >
        Nenhum ativo com coordenadas cadastradas.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds pins={pins} />
        {pins.map((pin) => {
          const color = STATUS_COLORS[pin.status ?? 'ATIVO'] ?? '#3b82f6'
          const isSelected = selectedId === pin.id
          return (
            <CircleMarker
              key={pin.id}
              center={[pin.latitude, pin.longitude]}
              radius={isSelected ? 12 : 9}
              pathOptions={{
                color: isSelected ? '#1d4ed8' : color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: isSelected ? 3 : 2,
              }}
              eventHandlers={
                onPinClick
                  ? { click: () => onPinClick(pin.id) }
                  : undefined
              }
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-xs">
                  <p className="font-semibold">{pin.nome}</p>
                  {pin.codigo ? <p>{pin.codigo}</p> : null}
                  {pin.localizacao ? <p className="text-muted-foreground">{pin.localizacao}</p> : null}
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
