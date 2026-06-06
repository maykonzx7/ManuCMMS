'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, Columns3, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { PageDataLoading } from '@/components/shared'
import { OsKanbanBoard } from '@/components/ordens/os-kanban-board'
import { OsAgendaCalendar } from '@/components/ordens/os-agenda-calendar'
import { useAuth, useCurrentUnit, useCurrentUser } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { mapApiOrdemToServiceOrder, type ApiOrdem } from '@/lib/backend-mappers'
import { usePermissions } from '@/hooks/use-permissions'
import { ROUTES } from '@/lib/routes'
import { toast } from 'sonner'

export default function OrdensAgendaPage() {
  const { accessToken } = useAuth()
  const user = useCurrentUser()
  const unit = useCurrentUnit()
  const { role } = usePermissions()
  const [orders, setOrders] = useState<
    Array<
      ReturnType<typeof mapApiOrdemToServiceOrder> & {
        statusSla?: string
        dataLimiteSla?: string | null
      }
    >
  >([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const isTecnico = role === 'TECNICO'

  useEffect(() => {
    if (!accessToken || !unit?.id) return
    setIsLoading(true)
    setLoadError(null)
    const query =
      isTecnico && user?.id
        ? `?${new URLSearchParams({ idTecnico: user.id }).toString()}`
        : ''
    void apiRequest<ApiOrdem[]>(`/unidades/${unit.id}/ordens-servico${query}`, { accessToken })
      .then((res) => {
        setOrders(
          res.map((item) => ({
            ...mapApiOrdemToServiceOrder(item, unit.id),
            statusSla: item.statusSla,
            dataLimiteSla: item.dataLimiteSla ?? null,
          })),
        )
      })
      .catch((error) => {
        setOrders([])
        const message = error instanceof Error ? error.message : 'Falha ao carregar ordens'
        setLoadError(message)
        toast.error(message)
      })
      .finally(() => setIsLoading(false))
  }, [accessToken, isTecnico, unit?.id, user?.id])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return orders
    return orders.filter(
      (o) =>
        o.numero.toLowerCase().includes(term) ||
        o.titulo.toLowerCase().includes(term) ||
        (o.ativo?.nome ?? '').toLowerCase().includes(term),
    )
  }, [orders, search])

  const kanbanOrders = useMemo(
    () =>
      filtered.map((o) => ({
        id: o.id,
        numero: o.numero,
        titulo: o.titulo,
        tipo: o.tipo,
        prioridade: o.prioridade,
        status: o.status,
        ativoNome: o.ativo?.nome,
        statusSla: o.statusSla,
        dataAbertura: o.dataAbertura,
      })),
    [filtered],
  )

  const agendaOrders = useMemo(
    () =>
      filtered.map((o) => ({
        id: o.id,
        numero: o.numero,
        titulo: o.titulo,
        tipo: o.tipo,
        status: o.status,
        ativoNome: o.ativo?.nome,
        statusSla: o.statusSla,
        dataAbertura: o.dataAbertura,
        dataFechamento: o.dataFechamento,
        dataLimiteSla: o.dataLimiteSla,
      })),
    [filtered],
  )

  if (isLoading) {
    return <PageDataLoading variant="dashboard" message="Carregando agenda..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={ROUTES.ordens}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agenda & Kanban</h1>
            <p className="text-muted-foreground">
              {isTecnico
                ? 'Visualize suas ordens por status ou calendário.'
                : `Planejamento visual das OS em ${unit?.nome ?? 'sua unidade'}.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={ROUTES.ordens}>
              <List className="mr-2 h-4 w-4" />
              Lista
            </Link>
          </Button>
        </div>
      </div>

      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}

      <Input
        placeholder="Buscar por número, descrição ou ativo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban" className="gap-2">
            <Columns3 className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="agenda" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Agenda
          </TabsTrigger>
        </TabsList>
        <TabsContent value="kanban" className="mt-4">
          <OsKanbanBoard orders={kanbanOrders} />
        </TabsContent>
        <TabsContent value="agenda" className="mt-4">
          <OsAgendaCalendar orders={agendaOrders} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
