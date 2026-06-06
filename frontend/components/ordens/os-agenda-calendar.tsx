'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  MAINTENANCE_TYPE_LABELS,
} from '@/lib/constants'
import { ROUTES } from '@/lib/routes'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'

export type AgendaOrder = {
  id: string
  numero: string
  titulo: string
  tipo: string
  status: OrderStatus
  ativoNome?: string
  statusSla?: string
  dataAbertura: string
  dataFechamento?: string | null
  dataLimiteSla?: string | null
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function OsAgendaCalendar({ orders }: { orders: AgendaOrder[] }) {
  const [selected, setSelected] = useState<Date | undefined>(new Date())
  const [month, setMonth] = useState<Date>(new Date())

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { aberturas: number; prazos: number; fechamentos: number }>()
    for (const order of orders) {
      const add = (dateStr: string | null | undefined, field: 'aberturas' | 'prazos' | 'fechamentos') => {
        if (!dateStr) return
        const key = new Date(dateStr).toDateString()
        const current = map.get(key) ?? { aberturas: 0, prazos: 0, fechamentos: 0 }
        current[field] += 1
        map.set(key, current)
      }
      add(order.dataAbertura, 'aberturas')
      add(order.dataLimiteSla, 'prazos')
      add(order.dataFechamento, 'fechamentos')
    }
    return map
  }, [orders])

  const selectedOrders = useMemo(() => {
    if (!selected) return []
    return orders
      .filter((order) => {
        const abertura = new Date(order.dataAbertura)
        const prazo = order.dataLimiteSla ? new Date(order.dataLimiteSla) : null
        const fechamento = order.dataFechamento ? new Date(order.dataFechamento) : null
        return (
          sameDay(abertura, selected) ||
          (prazo && sameDay(prazo, selected)) ||
          (fechamento && sameDay(fechamento, selected))
        )
      })
      .sort((a, b) => new Date(a.dataAbertura).getTime() - new Date(b.dataAbertura).getTime())
  }, [orders, selected])

  const modifiers = useMemo(() => {
    const withEvents: Date[] = []
    for (const [key] of eventsByDay) {
      withEvents.push(new Date(key))
    }
    return { hasEvents: withEvents }
  }, [eventsByDay])

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendário</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            month={month}
            onMonthChange={setMonth}
            modifiers={modifiers}
            modifiersClassNames={{
              hasEvents:
                'relative font-semibold after:absolute after:bottom-0.5 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-primary',
            }}
          />
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Abertura
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Prazo SLA
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Conclusão
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selected
              ? selected.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Selecione um dia'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedOrders.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma OS neste dia.
            </p>
          ) : (
            selectedOrders.map((order) => {
              const abertura = new Date(order.dataAbertura)
              const prazo = order.dataLimiteSla ? new Date(order.dataLimiteSla) : null
              const fechamento = order.dataFechamento ? new Date(order.dataFechamento) : null
              const markers: string[] = []
              if (selected && sameDay(abertura, selected)) {
                markers.push(`Aberta às ${formatTime(order.dataAbertura)}`)
              }
              if (selected && prazo && sameDay(prazo, selected)) {
                markers.push(`Prazo SLA às ${formatTime(order.dataLimiteSla!)}`)
              }
              if (selected && fechamento && sameDay(fechamento, selected)) {
                markers.push(`Concluída às ${formatTime(order.dataFechamento!)}`)
              }

              return (
                <Link
                  key={order.id}
                  href={`${ROUTES.ordens}/${order.id}`}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{order.numero}</span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', ORDER_STATUS_COLORS[order.status])}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                      {order.statusSla === 'ATRASADA' ? (
                        <Badge variant="destructive" className="text-xs">
                          SLA atrasado
                        </Badge>
                      ) : null}
                    </div>
                    <p className="font-medium">{order.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.ativoNome ?? 'Ativo'} ·{' '}
                      {MAINTENANCE_TYPE_LABELS[order.tipo as keyof typeof MAINTENANCE_TYPE_LABELS] ?? order.tipo}
                    </p>
                    <p className="text-xs text-muted-foreground">{markers.join(' · ')}</p>
                  </div>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
