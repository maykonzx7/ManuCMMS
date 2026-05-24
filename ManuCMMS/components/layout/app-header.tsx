'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useCurrentCompany, useCurrentUnit } from '@/lib/auth'

const routeLabels: Record<string, string> = {
  '/': 'Início',
  '/ordens': 'Ordens de Serviço',
  '/ordens/nova': 'Nova Ordem',
  '/ativos': 'Ativos',
  '/ativos/novo': 'Novo Ativo',
  '/usuarios': 'Usuários',
  '/unidades': 'Unidades',
  '/dashboard': 'Dashboard',
  '/auditoria': 'Auditoria',
  '/notificacoes': 'Notificações',
  '/relatorios': 'Relatórios',
  '/integracoes': 'Integrações',
  '/iot': 'IoT',
  '/permissoes': 'Permissões',
  '/configuracoes': 'Configurações',
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: { label: string; href: string; isLast: boolean }[] = []
  
  // Sempre adiciona Home
  breadcrumbs.push({
    label: 'Início',
    href: '/',
    isLast: segments.length === 0,
  })
  
  // Adiciona segmentos do path
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1
    
    // Verifica se é um ID dinâmico
    const isDynamicSegment = segment.match(/^[a-z0-9-]+$/) && 
      !routeLabels[currentPath] && 
      index > 0
    
    if (isDynamicSegment) {
      breadcrumbs.push({
        label: 'Detalhes',
        href: currentPath,
        isLast,
      })
    } else {
      breadcrumbs.push({
        label: routeLabels[currentPath] || segment,
        href: currentPath,
        isLast,
      })
    }
  })
  
  return breadcrumbs
}

export function AppHeader() {
  const pathname = usePathname()
  const company = useCurrentCompany()
  const unit = useCurrentUnit()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <BreadcrumbItem key={crumb.href}>
              {index > 0 && <BreadcrumbSeparator />}
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="ml-auto flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="w-64 pl-9"
          />
        </div>
        
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge 
            className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
            variant="destructive"
          >
            3
          </Badge>
          <span className="sr-only">Notificações</span>
        </Button>
        
        {/* Company/Unit context */}
        <div className="hidden items-center gap-2 text-sm lg:flex">
          <span className="text-muted-foreground">{company?.nome}</span>
          {unit && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium">{unit.nome}</span>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
