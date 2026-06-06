'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { apiRequest } from '@/lib/api'
import { useAuth, useCurrentCompany, useCurrentUnit } from '@/lib/auth'
import { useRealtimeConnection } from '@/hooks/use-realtime'

const routeLabels: Record<string, string> = {
  '/': 'Início',
  '/workspace': 'Início',
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
  '/admin': 'Painel Admin',
  '/permissoes': 'Permissões',
  '/configuracoes': 'Configurações',
}

function getBreadcrumbs(pathname: string) {
  const normalizedPathname = pathname.startsWith('/workspace')
    ? pathname.replace(/^\/workspace/, '') || '/'
    : pathname
  const segments = normalizedPathname.split('/').filter(Boolean)
  const breadcrumbs: { label: string; href: string; isLast: boolean }[] = []
  
  // Sempre adiciona Home
  breadcrumbs.push({
    label: 'Início',
    href: '/workspace',
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
        href: `/workspace${currentPath}`,
        isLast,
      })
    } else {
      breadcrumbs.push({
        label: routeLabels[currentPath] || segment,
        href: `/workspace${currentPath}`,
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
  const { accessToken } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const breadcrumbs = getBreadcrumbs(pathname)
  const isNotificationsPage = useMemo(
    () => pathname === '/workspace/notificacoes' || pathname === '/notificacoes',
    [pathname],
  )

  useEffect(() => {
    if (!accessToken) {
      setUnreadCount(0)
      return
    }

    let mounted = true
    const loadUnreadCount = async () => {
      try {
        const res = await apiRequest<Array<{ lidaEm: string | null }>>('/notificacoes', { accessToken })
        if (!mounted) return
        setUnreadCount(res.filter((item) => !item.lidaEm).length)
      } catch {
        if (!mounted) return
        setUnreadCount(0)
      }
    }

    const schedule = () => {
      void loadUnreadCount()
    }

    const idleId =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(schedule, { timeout: 1500 })
        : window.setTimeout(schedule, 600)

    const intervalId = window.setInterval(() => {
      void loadUnreadCount()
    }, 60000)

    return () => {
      mounted = false
      if (typeof window.cancelIdleCallback === 'function' && typeof idleId === 'number') {
        window.cancelIdleCallback(idleId)
      } else {
        window.clearTimeout(idleId)
      }
      window.clearInterval(intervalId)
    }
  }, [accessToken, isNotificationsPage])

  useRealtimeConnection(accessToken, company?.slug, {
    onNotificacaoNova: () => {
      setUnreadCount((prev) => prev + 1)
    },
  })

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <BreadcrumbItem key={crumb.href || `${crumb.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
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
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link href="/workspace/notificacoes">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <Badge 
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          ) : null}
          <span className="sr-only">Notificações</span>
          </Link>
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
