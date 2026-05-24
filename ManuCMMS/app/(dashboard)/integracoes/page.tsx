"use client"

import { useState } from 'react'
import { 
  Plug,
  Plus,
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Trash2,
  Edit,
  Zap,
  Cloud,
  Database,
  Bell,
  FileText,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const connectedIntegrations = [
  {
    id: '1',
    name: 'SAP ERP',
    description: 'Sincronização de dados de ativos e ordens de compra',
    icon: Database,
    status: 'active',
    lastSync: '2026-05-20T10:30:00',
    type: 'erp',
  },
  {
    id: '2',
    name: 'Microsoft Teams',
    description: 'Notificações e alertas via Teams',
    icon: Bell,
    status: 'active',
    lastSync: '2026-05-20T10:45:00',
    type: 'communication',
  },
  {
    id: '3',
    name: 'Power BI',
    description: 'Exportação de dados para dashboards',
    icon: BarChart3,
    status: 'inactive',
    lastSync: '2026-05-15T08:00:00',
    type: 'analytics',
  },
]

const availableIntegrations = [
  {
    id: 'oracle',
    name: 'Oracle EBS',
    description: 'Integração com Oracle E-Business Suite',
    icon: Database,
    category: 'ERP',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sincronização de dados de clientes e contratos',
    icon: Cloud,
    category: 'CRM',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Notificações e alertas via Slack',
    icon: Bell,
    category: 'Comunicação',
  },
  {
    id: 'webhook',
    name: 'Webhook Personalizado',
    description: 'Envie dados para qualquer endpoint HTTP',
    icon: Zap,
    category: 'Automação',
  },
  {
    id: 'excel',
    name: 'Microsoft Excel',
    description: 'Exportação automática para planilhas',
    icon: FileText,
    category: 'Produtividade',
  },
  {
    id: 'api',
    name: 'API REST',
    description: 'Acesso via API para integrações customizadas',
    icon: Plug,
    category: 'Desenvolvimento',
  },
]

export default function IntegracoesPage() {
  const [integrations, setIntegrations] = useState(connectedIntegrations)

  const toggleIntegration = (id: string) => {
    setIntegrations(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, status: i.status === 'active' ? 'inactive' : 'active' }
          : i
      )
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">
            Conecte o ManuCMMS com outros sistemas
          </p>
        </div>
      </div>

      <Tabs defaultValue="conectadas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="conectadas">
            Conectadas
            <Badge variant="secondary" className="ml-2">
              {integrations.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="disponiveis">Disponíveis</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="conectadas" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plug className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">Nenhuma integração conectada</h3>
                <p className="text-sm text-muted-foreground">
                  Conecte integrações para sincronizar dados com outros sistemas
                </p>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Integração
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <integration.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {integration.status === 'active' ? (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-500 text-slate-500">
                            <XCircle className="mr-1 h-3 w-3" />
                            Inativa
                          </Badge>
                        )}
                      </div>
                      <Switch
                        checked={integration.status === 'active'}
                        onCheckedChange={() => toggleIntegration(integration.id)}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Última sincronização:{' '}
                      {new Date(integration.lastSync).toLocaleString('pt-BR')}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sincronizar
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="disponiveis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableIntegrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <integration.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <Badge variant="secondary">{integration.category}</Badge>
                      </div>
                      <CardDescription className="mt-1">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Conectar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Conectar {integration.name}</DialogTitle>
                        <DialogDescription>
                          Configure as credenciais para conectar esta integração
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>URL do Endpoint</Label>
                          <Input placeholder="https://api.exemplo.com" />
                        </div>
                        <div className="space-y-2">
                          <Label>API Key</Label>
                          <Input type="password" placeholder="Sua chave de API" />
                        </div>
                        <div className="space-y-2">
                          <Label>Secret</Label>
                          <Input type="password" placeholder="Seu secret" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancelar</Button>
                        <Button>Conectar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Acesso à API</CardTitle>
              <CardDescription>
                Use a API REST do ManuCMMS para integrações customizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>URL Base da API</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value="https://api.manucmms.com/v1" 
                    className="font-mono"
                  />
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Chave de API</Label>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value="mc_live_••••••••••••••••" 
                    className="font-mono"
                  />
                  <Button variant="outline">Copiar</Button>
                  <Button variant="outline">Regenerar</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mantenha sua chave de API em segurança. Não compartilhe publicamente.
                </p>
              </div>

              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium">Documentação da API</h4>
                <p className="text-sm text-muted-foreground">
                  Acesse a documentação completa da API com exemplos de código e referência de endpoints.
                </p>
                <Button variant="outline" className="mt-2">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver Documentação
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Webhooks</h4>
                <div className="space-y-2">
                  <Label>URL do Webhook</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://seu-servidor.com/webhook" />
                    <Button>Salvar</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Eventos disponíveis:</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">order.created</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">order.updated</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">order.completed</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">asset.status_changed</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
