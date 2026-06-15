'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, ExternalLink } from 'lucide-react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type LeituraIotHistoricoItem = {
  id: string
  valor: number
  limiteTemp: number
  origem: 'IOT' | 'SIMULACAO'
  consecutivasAcimaLimite: number
  osPreditivaDisparada: boolean
  ordemServicoId: string | null
  ordemServicoRef: string | null
  correlationId: string | null
  createdAt: string
}

type AtivoOption = {
  id: string
  nome: string
  limiteTemp?: number
}

type Props = {
  ativos: AtivoOption[]
  selectedAtivoId: string
  onSelectAtivo: (id: string) => void
  leituras: LeituraIotHistoricoItem[]
  limiteTemp: number | null
  isLoading?: boolean
}

const chartConfig = {
  valor: { label: 'Temperatura (°C)', color: 'hsl(217 91% 60%)' },
} satisfies ChartConfig

function formatLeituraTime(iso: string): string {
  try {
    return format(new Date(iso), 'dd/MM HH:mm:ss', { locale: ptBR })
  } catch {
    return iso
  }
}

export function IotLeiturasHistoricoChart({
  ativos,
  selectedAtivoId,
  onSelectAtivo,
  leituras,
  limiteTemp,
  isLoading,
}: Props) {
  const chartData = useMemo(
    () =>
      leituras.map((item) => ({
        ...item,
        label: formatLeituraTime(item.createdAt),
      })),
    [leituras],
  )

  const limite = limiteTemp ?? leituras[0]?.limiteTemp ?? null
  const osGeradas = leituras.filter((l) => l.osPreditivaDisparada).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select value={selectedAtivoId} onValueChange={onSelectAtivo}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="Selecione um ativo" />
          </SelectTrigger>
          <SelectContent>
            {ativos.map((ativo) => (
              <SelectItem key={ativo.id} value={ativo.id}>
                {ativo.nome}
                {typeof ativo.limiteTemp === 'number' ? ` · ${ativo.limiteTemp}°C` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{leituras.length} leituras</Badge>
          {osGeradas > 0 ? (
            <Badge variant="outline" className="border-violet-500 text-violet-600">
              {osGeradas} OS disparada(s)
            </Badge>
          ) : null}
          {limite !== null ? (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Limite {limite}°C
            </Badge>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando histórico...</p>
      ) : leituras.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma leitura registrada ainda. Use &quot;Simular alerta&quot; ou envie telemetria via
          gateway IoT.
        </p>
      ) : (
        <>
          <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
            <LineChart data={chartData} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                domain={['auto', 'auto']}
                unit="°C"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.label ?? ''
                    }
                    formatter={(value, _name, item) => {
                      const row = item.payload as LeituraIotHistoricoItem & {
                        label: string
                      }
                      return (
                        <div className="space-y-1">
                          <div>{Number(value).toFixed(1)}°C</div>
                          <div className="text-xs text-muted-foreground">
                            {row.origem === 'SIMULACAO' ? 'Simulação' : 'IoT'} ·{' '}
                            {row.consecutivasAcimaLimite} acima do limite
                          </div>
                          {row.osPreditivaDisparada ? (
                            <div className="text-xs font-medium text-violet-600">
                              OS preditiva disparada
                              {row.ordemServicoRef ? ` · ${row.ordemServicoRef}` : ''}
                            </div>
                          ) : null}
                        </div>
                      )
                    }}
                  />
                }
              />
              {limite !== null ? (
                <ReferenceLine
                  y={limite}
                  stroke="hsl(38 92% 50%)"
                  strokeDasharray="6 4"
                  label={{ value: `Limite ${limite}°C`, position: 'insideTopRight', fill: 'hsl(38 92% 50%)', fontSize: 11 }}
                />
              ) : null}
              <Line
                type="monotone"
                dataKey="valor"
                stroke="var(--color-valor)"
                strokeWidth={2}
                dot={({ cx, cy, payload }) => {
                  if (cx == null || cy == null) return null
                  const p = payload as LeituraIotHistoricoItem
                  if (p.osPreditivaDisparada) {
                    return (
                      <circle
                        key={p.id}
                        cx={cx}
                        cy={cy}
                        r={7}
                        fill="hsl(271 81% 56%)"
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    )
                  }
                  return (
                    <circle
                      key={p.id}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill="var(--color-valor)"
                      stroke="hsl(var(--background))"
                      strokeWidth={1}
                    />
                  )
                }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ChartContainer>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[hsl(217_91%_60%)]" />
              Leitura normal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full bg-[hsl(271_81%_56%)]" />
              Disparou OS preditiva
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-amber-500" />
              Linha = limite térmico
            </span>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Seq. acima</TableHead>
                  <TableHead>OS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...leituras].reverse().slice(0, 20).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatLeituraTime(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className={item.valor > item.limiteTemp ? 'font-medium text-amber-600' : ''}>
                        {item.valor.toFixed(1)}°C
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.origem === 'SIMULACAO' ? 'Simulação' : 'IoT'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.consecutivasAcimaLimite}</TableCell>
                    <TableCell>
                      {item.ordemServicoId ? (
                        <Link
                          href={`/ordens/${item.ordemServicoId}`}
                          className="inline-flex items-center gap-1 text-xs text-violet-600 underline-offset-2 hover:underline"
                        >
                          {item.ordemServicoRef ?? item.ordemServicoId.slice(0, 8)}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : item.osPreditivaDisparada ? (
                        <span className="text-xs text-muted-foreground">Processando…</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
