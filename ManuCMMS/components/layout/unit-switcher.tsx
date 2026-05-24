'use client'

import { ChevronsUpDown, Building2, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth, useCurrentUnit, useAvailableUnits } from '@/lib/auth'

export function UnitSwitcher() {
  const { isMobile } = useSidebar()
  const { setUnidadeAtual } = useAuth()
  const currentUnit = useCurrentUnit()
  const availableUnits = useAvailableUnits()

  if (availableUnits.length <= 1) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg border bg-background">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {currentUnit?.nome || 'Sem unidade'}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {currentUnit?.codigo || '-'}
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg border bg-background">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentUnit?.nome || 'Selecione'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {currentUnit?.codigo || 'uma unidade'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Unidades
            </DropdownMenuLabel>
            {availableUnits.map((unit) => (
              <DropdownMenuItem
                key={unit.id}
                onClick={() => setUnidadeAtual(unit)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Building2 className="size-3.5 shrink-0" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm">{unit.nome}</span>
                  <span className="text-xs text-muted-foreground">{unit.codigo}</span>
                </div>
                {currentUnit?.id === unit.id && (
                  <Check className="ml-auto size-4" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2 text-muted-foreground">
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Building2 className="size-3.5" />
              </div>
              <span className="text-sm">Gerenciar unidades</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
