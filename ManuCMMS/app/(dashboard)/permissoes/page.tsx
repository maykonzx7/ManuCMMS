'use client'

import { useState } from 'react'
import { Shield, Check, X, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SCREEN_PERMISSIONS, USER_ROLE_LABELS } from '@/lib/constants'
import type { UserRole } from '@/types'

const screens = [
  { key: 'home', label: 'Início', description: 'Painel principal com KPIs' },
  { key: 'ordens-lista', label: 'Ordens de Serviço', description: 'Lista de ordens' },
  { key: 'ordens-detalhe', label: 'Detalhes da OS', description: 'Ver e gerenciar OS' },
  { key: 'ativos-lista', label: 'Lista de Ativos', description: 'Visualizar ativos' },
  { key: 'ativos-cadastro', label: 'Cadastro de Ativos', description: 'Criar e editar ativos' },
  { key: 'usuarios', label: 'Usuários', description: 'Gerenciar usuários' },
  { key: 'unidades', label: 'Unidades', description: 'Gerenciar unidades' },
  { key: 'dashboard', label: 'Dashboard', description: 'Análises e gráficos' },
  { key: 'auditoria', label: 'Auditoria', description: 'Trilha de auditoria' },
  { key: 'notificacoes', label: 'Notificações', description: 'Central de notificações' },
  { key: 'relatorios', label: 'Relatórios', description: 'Exportar relatórios' },
  { key: 'integracoes', label: 'Integrações', description: 'Status das integrações' },
  { key: 'iot', label: 'IoT', description: 'Monitoramento IoT' },
  { key: 'permissoes', label: 'Permissões', description: 'Configurar permissões' },
  { key: 'configuracoes', label: 'Configurações', description: 'Configurações gerais' },
]

const roles: UserRole[] = ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN']

export default function PermissionsPage() {
  const hasPermission = (screen: string, role: UserRole) => {
    return SCREEN_PERMISSIONS[screen]?.includes(role) || false
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Permissões</h1>
        <p className="text-muted-foreground">
          Visualize as permissões de acesso por perfil de usuário
        </p>
      </div>

      {/* Role Legend */}
      <div className="flex flex-wrap gap-3">
        {roles.map((role) => (
          <Badge key={role} variant="outline" className="text-sm">
            {USER_ROLE_LABELS[role]}
          </Badge>
        ))}
      </div>

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Matriz de Permissões
          </CardTitle>
          <CardDescription>
            Cada perfil tem acesso a diferentes funcionalidades do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Funcionalidade</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role} className="text-center w-28">
                      {USER_ROLE_LABELS[role]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {screens.map((screen) => (
                  <TableRow key={screen.key}>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{screen.label}</span>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{screen.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    {roles.map((role) => (
                      <TableCell key={`${screen.key}-${role}`} className="text-center">
                        {hasPermission(screen.key, role) ? (
                          <div className="flex justify-center">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                              <Check className="h-4 w-4 text-emerald-500" />
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/10">
                              <X className="h-4 w-4 text-red-500/50" />
                            </div>
                          </div>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Técnico</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Acesso básico para executar ordens de serviço. Pode visualizar ativos e criar/iniciar/fechar ordens atribuídas.
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Supervisor</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Gerencia equipes técnicas e distribui ordens de serviço. Pode cadastrar ativos e gerenciar usuários da unidade.
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gestor</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Acesso completo às análises e relatórios. Gerencia toda a operação de manutenção e pode configurar integrações.
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Auditor</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Acesso somente leitura para fins de auditoria. Pode ver histórico, relatórios e trilha de auditoria sem modificar dados.
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Administrador</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Acesso total ao sistema. Pode configurar permissões, integrações, IoT e todas as funcionalidades administrativas.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
