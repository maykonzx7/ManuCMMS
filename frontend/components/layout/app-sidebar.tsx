'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Home,
  ClipboardList,
  Package,
  Users,
  Building2,
  Shield,
  BarChart3,
  FileText,
  History,
  Bell,
  Plug,
  Cpu,
  Settings,
  ChevronRight,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { usePermissions } from '@/hooks/use-permissions'
import { SIDEBAR_NAVIGATION } from '@/lib/constants'
import { UnitSwitcher } from './unit-switcher'
import { UserNav } from './user-nav'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  ClipboardList,
  Package,
  Users,
  Building2,
  Shield,
  BarChart3,
  FileText,
  History,
  Bell,
  Plug,
  Cpu,
  Settings,
}

export function AppSidebar() {
  const pathname = usePathname()
  const { hasPermission } = usePermissions()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/workspace">
                <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-transparent">
                  <Image
                    src="/manucmms-icon-oficial.png"
                    alt="Logo ManuCMMS"
                    width={24}
                    height={24}
                    className="h-6 w-6 object-contain"
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold">ManuCMMS</span>
                  <span className="text-xs text-muted-foreground">Gestão de Manutenção</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="group-data-[collapsible=icon]:hidden">
          <UnitSwitcher />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {SIDEBAR_NAVIGATION.map((group) => {
          const visibleItems = group.items.filter((item) =>
            hasPermission(item.screen)
          )
          
          if (visibleItems.length === 0) return null
          
          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const Icon = iconMap[item.icon] || Home
                    const isActive = pathname === item.url || 
                      (item.url !== '/' && pathname.startsWith(item.url))
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                        >
                          <Link href={item.url}>
                            <Icon className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}

      </SidebarContent>

      <SidebarFooter>
        <UserNav />
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}
