"use client"

import { useState } from 'react'
import { 
  Cpu,
  Thermometer,
  Vibrate,
  Gauge,
  Zap,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Settings,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const sensors = [
  {
    id: '1',
    name: 'Sensor Temp. Motor 01',
    type: 'temperature',
    assetName: 'Motor Principal - Linha 1',
    value: 72.5,
    unit: '°C',
    status: 'normal',
    lastReading: '2026-05-20T10:55:00',
    threshold: { min: 20, max: 80, critical: 90 },
    battery: 85,
    signal: 95,
  },
  {
    id: '2',
    name: 'Sensor Vibração Compressor',
    type: 'vibration',
    assetName: 'Compressor Industrial',
    value: 4.2,
    unit: 'mm/s',
    status: 'warning',
    lastReading: '2026-05-20T10:54:00',
    threshold: { min: 0, max: 3.5, critical: 5 },
    battery: 62,
    signal: 88,
  },
  {
    id: '3',
    name: 'Sensor Pressão Caldeira',
    type: 'pressure',
    assetName: 'Caldeira Principal',
    value: 8.5,
    unit: 'bar',
    status: 'normal',
    lastReading: '2026-05-20T10:55:00',
    threshold: { min: 6, max: 10, critical: 12 },
    battery: 91,
    signal: 100,
  },
  {
    id: '4',
    name: 'Sensor Corrente Bomba',
    type: 'current',
    assetName: 'Bomba Hidráulica',
    value: 15.8,
    unit: 'A',
    status: 'normal',
    lastReading: '2026-05-20T10:53:00',
    threshold: { min: 10, max: 20, critical: 25 },
    battery: 78,
    signal: 92,
  },
  {
    id: '5',
    name: 'Sensor Temp. Forno',
    type: 'temperature',
    assetName: 'Forno Industrial',
    value: 245,
    unit: '°C',
    status: 'normal',
    lastReading: '2026-05-20T10:55:00',
    threshold: { min: 200, max: 280, critical: 300 },
    battery: 95,
    signal: 98,
  },
  {
    id: '6',
    name: 'Sensor Vibração Motor 02',
    type: 'vibration',
    assetName: 'Motor Secundário',
    value: 6.1,
    unit: 'mm/s',
    status: 'critical',
    lastReading: '2026-05-20T10:52:00',
    threshold: { min: 0, max: 3.5, critical: 5 },
    battery: 45,
    signal: 75,
  },
]

const sensorIcons = {
  temperature: Thermometer,
  vibration: Vibrate,
  pressure: Gauge,
  current: Zap,
}

const statusConfig = {
  normal: {
    label: 'Normal',
    color: 'border-emerald-500 text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  warning: {
    label: 'Alerta',
    color: 'border-amber-500 text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  critical: {
    label: 'Crítico',
    color: 'border-rose-500 text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  offline: {
    label: 'Offline',
    color: 'border-slate-500 text-slate-500',
    bgColor: 'bg-slate-500/10',
  },
}

export default function IotPage() {
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredSensors = statusFilter === 'all' 
    ? sensors 
    : sensors.filter(s => s.status === statusFilter)

  const sensorStats = {
    total: sensors.length,
    normal: sensors.filter(s => s.status === 'normal').length,
    warning: sensors.filter(s => s.status === 'warning').length,
    critical: sensors.filter(s => s.status === 'critical').length,
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoramento IoT</h1>
          <p className="text-muted-foreground">
            Dados em tempo real dos sensores industriais
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Sensor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Sensores</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sensorStats.total}</div>
            <p className="text-xs text-muted-foreground">dispositivos conectados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Normal</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{sensorStats.normal}</div>
            <Progress 
              value={(sensorStats.normal / sensorStats.total) * 100} 
              className="mt-2 h-2 [&>div]:bg-emerald-500"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Alerta</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{sensorStats.warning}</div>
            <Progress 
              value={(sensorStats.warning / sensorStats.total) * 100} 
              className="mt-2 h-2 [&>div]:bg-amber-500"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Crítico</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">{sensorStats.critical}</div>
            <Progress 
              value={(sensorStats.critical / sensorStats.total) * 100} 
              className="mt-2 h-2 [&>div]:bg-rose-500"
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sensores" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="sensores">Sensores</TabsTrigger>
            <TabsTrigger value="alertas">Alertas Recentes</TabsTrigger>
            <TabsTrigger value="configuracao">Configuração</TabsTrigger>
          </TabsList>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="warning">Alerta</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="sensores" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSensors.map((sensor) => {
              const Icon = sensorIcons[sensor.type as keyof typeof sensorIcons] || Cpu
              const status = statusConfig[sensor.status as keyof typeof statusConfig]
              const valuePercent = ((sensor.value - sensor.threshold.min) / (sensor.threshold.critical - sensor.threshold.min)) * 100
              
              return (
                <Card key={sensor.id} className={cn(
                  "transition-all",
                  sensor.status === 'critical' && "border-rose-500/50"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          status.bgColor
                        )}>
                          <Icon className={cn("h-5 w-5", status.color.split(' ')[1])} />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{sensor.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {sensor.assetName}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Value Display */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold">{sensor.value}</p>
                        <p className="text-sm text-muted-foreground">{sensor.unit}</p>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        {sensor.status === 'normal' ? (
                          <TrendingDown className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-rose-500" />
                        )}
                        <span className={sensor.status === 'normal' ? 'text-emerald-500' : 'text-rose-500'}>
                          {sensor.status === 'normal' ? '-2.3%' : '+8.5%'}
                        </span>
                      </div>
                    </div>

                    {/* Threshold Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{sensor.threshold.min}{sensor.unit}</span>
                        <span>{sensor.threshold.critical}{sensor.unit}</span>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted">
                        <div 
                          className={cn(
                            "absolute left-0 top-0 h-full rounded-full transition-all",
                            sensor.status === 'normal' && "bg-emerald-500",
                            sensor.status === 'warning' && "bg-amber-500",
                            sensor.status === 'critical' && "bg-rose-500"
                          )}
                          style={{ width: `${Math.min(valuePercent, 100)}%` }}
                        />
                        <div 
                          className="absolute top-0 h-full w-0.5 bg-amber-500"
                          style={{ left: `${((sensor.threshold.max - sensor.threshold.min) / (sensor.threshold.critical - sensor.threshold.min)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Status Bar */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Wifi className="h-3 w-3" />
                          {sensor.signal}%
                        </div>
                        <div className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {sensor.battery}%
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(sensor.lastReading).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurar
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas Recentes</CardTitle>
              <CardDescription>
                Últimos alertas gerados pelos sensores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    sensor: 'Sensor Vibração Motor 02',
                    message: 'Nível de vibração acima do limite crítico (6.1 mm/s)',
                    time: '2 minutos atrás',
                    severity: 'critical',
                  },
                  {
                    sensor: 'Sensor Vibração Compressor',
                    message: 'Nível de vibração acima do limite normal (4.2 mm/s)',
                    time: '15 minutos atrás',
                    severity: 'warning',
                  },
                  {
                    sensor: 'Sensor Temp. Motor 01',
                    message: 'Temperatura estabilizada dentro dos parâmetros',
                    time: '1 hora atrás',
                    severity: 'info',
                  },
                ].map((alert, index) => (
                  <div 
                    key={index} 
                    className={cn(
                      "flex items-start gap-4 rounded-lg border p-4",
                      alert.severity === 'critical' && "border-rose-500/50 bg-rose-500/5",
                      alert.severity === 'warning' && "border-amber-500/50 bg-amber-500/5"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      alert.severity === 'critical' && "bg-rose-500/10",
                      alert.severity === 'warning' && "bg-amber-500/10",
                      alert.severity === 'info' && "bg-blue-500/10"
                    )}>
                      <AlertTriangle className={cn(
                        "h-4 w-4",
                        alert.severity === 'critical' && "text-rose-500",
                        alert.severity === 'warning' && "text-amber-500",
                        alert.severity === 'info' && "text-blue-500"
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{alert.sensor}</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Monitoramento</CardTitle>
              <CardDescription>
                Configure os parâmetros globais de monitoramento IoT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Intervalo de Leitura</label>
                  <Select defaultValue="60">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 segundos</SelectItem>
                      <SelectItem value="60">1 minuto</SelectItem>
                      <SelectItem value="300">5 minutos</SelectItem>
                      <SelectItem value="600">10 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Retenção de Dados</label>
                  <Select defaultValue="90">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                      <SelectItem value="180">180 dias</SelectItem>
                      <SelectItem value="365">1 ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button>Salvar Configurações</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
