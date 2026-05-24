import Link from 'next/link'
import { ArrowRight, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Asset } from '@/types'
import { ASSET_STATUS_LABELS, ASSET_STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface AssetsSummaryProps {
  assets: Asset[]
  totalAssets: number
  assetsInMaintenance: number
  className?: string
}

export function AssetsSummary({
  assets,
  totalAssets,
  assetsInMaintenance,
  className,
}: AssetsSummaryProps) {
  const maintenancePercentage = totalAssets > 0 
    ? (assetsInMaintenance / totalAssets) * 100 
    : 0
  const availabilityPercentage = 100 - maintenancePercentage

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Resumo de Ativos</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ativos">
            Ver todos
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Availability indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taxa de Disponibilidade</span>
            <span className="font-medium">{availabilityPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={availabilityPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{totalAssets - assetsInMaintenance} disponíveis</span>
            <span>{assetsInMaintenance} em manutenção</span>
          </div>
        </div>

        {/* Recent assets */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Ativos Recentes
          </h4>
          {assets.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nenhum ativo cadastrado
            </p>
          ) : (
            assets.slice(0, 4).map((asset) => (
              <Link
                key={asset.id}
                href={`/ativos/${asset.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-[150px]">
                      {asset.nome}
                    </p>
                    <p className="text-xs text-muted-foreground">{asset.codigo}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn('text-xs', ASSET_STATUS_COLORS[asset.status])}
                >
                  {ASSET_STATUS_LABELS[asset.status]}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
