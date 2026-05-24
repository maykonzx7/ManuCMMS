"use client"

import { useState } from 'react'
import { 
  FileText,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  FilePieChart,
  FileBarChart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const reportTemplates = [
  {
    id: 1,
    name: 'Relatório de Ordens de Serviço',
    description: 'Resumo completo das ordens de serviço por período',
    icon: FileBarChart,
    category: 'ordens',
  },
  {
    id: 2,
    name: 'Relatório de Ativos',
    description: 'Inventário e status de todos os ativos',
    icon: FileSpreadsheet,
    category: 'ativos',
  },
  {
    id: 3,
    name: 'Indicadores de Performance (KPIs)',
    description: 'MTBF, MTTR, disponibilidade e outras métricas',
    icon: FilePieChart,
    category: 'kpis',
  },
  {
    id: 4,
    name: 'Relatório de Custos',
    description: 'Análise de custos de manutenção por período',
    icon: FileText,
    category: 'custos',
  },
  {
    id: 5,
    name: 'Relatório de Manutenção Preventiva',
    description: 'Plano de manutenções preventivas programadas',
    icon: Calendar,
    category: 'preventiva',
  },
  {
    id: 6,
    name: 'Relatório de Auditoria',
    description: 'Histórico de alterações e ações do sistema',
    icon: FileText,
    category: 'auditoria',
  },
]

const generatedReports = [
  {
    id: 1,
    name: 'OS_Maio_2026.pdf',
    type: 'Ordens de Serviço',
    createdAt: '2026-05-18T10:30:00',
    createdBy: 'João Silva',
    size: '2.4 MB',
    status: 'ready',
  },
  {
    id: 2,
    name: 'KPIs_Q2_2026.xlsx',
    type: 'KPIs',
    createdAt: '2026-05-15T14:20:00',
    createdBy: 'Maria Santos',
    size: '1.8 MB',
    status: 'ready',
  },
  {
    id: 3,
    name: 'Ativos_Inventario.pdf',
    type: 'Ativos',
    createdAt: '2026-05-10T09:15:00',
    createdBy: 'Carlos Lima',
    size: '5.2 MB',
    status: 'ready',
  },
  {
    id: 4,
    name: 'Custos_Abril_2026.xlsx',
    type: 'Custos',
    createdAt: '2026-05-01T16:45:00',
    createdBy: 'Ana Costa',
    size: '980 KB',
    status: 'ready',
  },
]

const scheduledReports = [
  {
    id: 1,
    name: 'Relatório Semanal de OS',
    frequency: 'Semanal',
    nextRun: '2026-05-27T08:00:00',
    recipients: ['gestao@empresa.com'],
    status: 'active',
  },
  {
    id: 2,
    name: 'KPIs Mensais',
    frequency: 'Mensal',
    nextRun: '2026-06-01T08:00:00',
    recipients: ['diretoria@empresa.com', 'gestao@empresa.com'],
    status: 'active',
  },
  {
    id: 3,
    name: 'Inventário de Ativos',
    frequency: 'Trimestral',
    nextRun: '2026-07-01T08:00:00',
    recipients: ['patrimonio@empresa.com'],
    status: 'paused',
  },
]

export default function RelatoriosPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredTemplates = selectedCategory === 'all' 
    ? reportTemplates 
    : reportTemplates.filter(t => t.category === selectedCategory)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere e gerencie relatórios do sistema
          </p>
        </div>
      </div>

      <Tabs defaultValue="gerar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gerar">Gerar Relatório</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="agendados">Agendados</TabsTrigger>
        </TabsList>

        <TabsContent value="gerar" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="ordens">Ordens de Serviço</SelectItem>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="kpis">KPIs</SelectItem>
                <SelectItem value="custos">Custos</SelectItem>
                <SelectItem value="preventiva">Preventiva</SelectItem>
                <SelectItem value="auditoria">Auditoria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Report Templates */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <template.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Configurar
                    </Button>
                    <Button size="sm" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Gerar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Generate */}
          <Card>
            <CardHeader>
              <CardTitle>Geração Rápida</CardTitle>
              <CardDescription>
                Configure os parâmetros para gerar um relatório personalizado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Tipo de Relatório</Label>
                  <Select defaultValue="ordens">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ordens">Ordens de Serviço</SelectItem>
                      <SelectItem value="ativos">Ativos</SelectItem>
                      <SelectItem value="kpis">KPIs</SelectItem>
                      <SelectItem value="custos">Custos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input type="date" defaultValue="2026-05-01" />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input type="date" defaultValue="2026-05-20" />
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select defaultValue="pdf">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="mt-4">
                <FileText className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Gerados</CardTitle>
              <CardDescription>
                Histórico de relatórios gerados recentemente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Criado por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>{report.type}</TableCell>
                      <TableCell>{report.createdBy}</TableCell>
                      <TableCell>
                        {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{report.size}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Pronto
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agendados" className="space-y-4">
          <div className="flex justify-end">
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Relatórios Agendados</CardTitle>
              <CardDescription>
                Relatórios com geração automática programada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Próxima Execução</TableHead>
                    <TableHead>Destinatários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{report.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {report.frequency}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(report.nextRun).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {report.recipients.length} destinatário(s)
                        </span>
                      </TableCell>
                      <TableCell>
                        {report.status === 'active' ? (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-amber-500">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Pausado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
