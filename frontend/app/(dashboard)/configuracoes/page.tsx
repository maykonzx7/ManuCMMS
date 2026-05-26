'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  Building2, 
  Bell, 
  Palette,
  Globe,
  Shield,
  Save,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useCurrentCompany } from '@/lib/auth'
import { useAuth } from '@/lib/auth'
import { useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { formatCep, lookupCep, normalizeCep } from '@/lib/cep'
import { usePermissions } from '@/hooks/use-permissions'

export default function SettingsPage() {
  const router = useRouter()
  const company = useCurrentCompany()
  const { accessToken } = useAuth()
  const currentUnit = useCurrentUnit()
  const { hasPermission } = usePermissions()
  const canManageSettings = hasPermission('configuracoes')
  const [isLoading, setIsLoading] = useState(false)
  const [empresaNome, setEmpresaNome] = useState(company?.nome || '')
  const [empresaSlug, setEmpresaSlug] = useState(company?.slug || '')
  const [empresaCnpj, setEmpresaCnpj] = useState('')
  const [empresaCep, setEmpresaCep] = useState('')
  const [empresaEndereco, setEmpresaEndereco] = useState('')
  const [empresaNumero, setEmpresaNumero] = useState('')
  const [empresaBairro, setEmpresaBairro] = useState('')
  const [empresaCidade, setEmpresaCidade] = useState('')
  const [empresaEstado, setEmpresaEstado] = useState('')
  const [contatoNome, setContatoNome] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [contatoTelefone, setContatoTelefone] = useState('')
  const [cepLoading, setCepLoading] = useState(false)
  const [empresaStatus, setEmpresaStatus] = useState<'ATIVA' | 'INATIVA' | 'SUSPENSA'>('ATIVA')
  const [slaCorretivaHoras, setSlaCorretivaHoras] = useState(24)
  const [slaPreventivaHoras, setSlaPreventivaHoras] = useState(168)
  const [slaPreditivaHoras, setSlaPreditivaHoras] = useState(72)

  useEffect(() => {
    if (canManageSettings) return
    toast.error('Seu perfil não tem acesso às configurações da empresa.')
    router.replace('/dashboard')
  }, [canManageSettings, router])

  useEffect(() => {
    if (!canManageSettings || !accessToken || !company?.id) return
    void apiRequest<{ empresa: {
      nomeEmpresa: string; slug: string; status: 'ATIVA' | 'INATIVA' | 'SUSPENSA';
      cnpj?: string | null; cep?: string | null; endereco?: string | null; numeroEndereco?: string | null;
      bairro?: string | null; cidade?: string | null; estado?: string | null;
      contatoNome?: string | null; contatoEmail?: string | null; contatoTelefone?: string | null;
    } }>(
      `/empresas/${company.id}/gestao/painel`,
      { accessToken },
    )
      .then((res) => {
        setEmpresaNome(res.empresa.nomeEmpresa)
        setEmpresaSlug(res.empresa.slug)
        setEmpresaStatus(res.empresa.status)
        setEmpresaCnpj(res.empresa.cnpj ?? '')
        setEmpresaCep(res.empresa.cep ?? '')
        setEmpresaEndereco(res.empresa.endereco ?? '')
        setEmpresaNumero(res.empresa.numeroEndereco ?? '')
        setEmpresaBairro(res.empresa.bairro ?? '')
        setEmpresaCidade(res.empresa.cidade ?? '')
        setEmpresaEstado(res.empresa.estado ?? '')
        setContatoNome(res.empresa.contatoNome ?? '')
        setContatoEmail(res.empresa.contatoEmail ?? '')
        setContatoTelefone(res.empresa.contatoTelefone ?? '')
      })
      .catch(() => {
        setEmpresaNome(company.nome)
        setEmpresaSlug(company.slug)
      })
  }, [canManageSettings, accessToken, company?.id, company?.nome, company?.slug])

  useEffect(() => {
    if (!canManageSettings || !accessToken || !currentUnit?.id) return
    void apiRequest<{
      slaCorretivaHoras?: number
      slaPreventivaHoras?: number
      slaPreditivaHoras?: number
    }>(`/unidades/${currentUnit.id}`, { accessToken })
      .then((res) => {
        setSlaCorretivaHoras(Number(res.slaCorretivaHoras ?? 24))
        setSlaPreventivaHoras(Number(res.slaPreventivaHoras ?? 168))
        setSlaPreditivaHoras(Number(res.slaPreditivaHoras ?? 72))
      })
      .catch(() => undefined)
  }, [canManageSettings, accessToken, currentUnit?.id])

  const handleSave = async () => {
    if (!canManageSettings) {
      toast.error('Seu perfil não pode alterar configurações.')
      return
    }
    setIsLoading(true)
    try {
      if (!accessToken || !company?.id) throw new Error('Sessão inválida')
      await apiRequest(`/empresas/${company.id}/gestao/dados`, {
        method: 'PATCH',
        accessToken,
        body: {
          nomeEmpresa: empresaNome,
          cnpj: empresaCnpj,
          cep: empresaCep,
          endereco: empresaEndereco,
          numeroEndereco: empresaNumero,
          bairro: empresaBairro,
          cidade: empresaCidade,
          estado: empresaEstado,
          contatoNome,
          contatoEmail,
          contatoTelefone,
        },
      })
      await apiRequest(`/empresas/${company.id}/gestao/status`, {
        method: 'PATCH',
        accessToken,
        body: { status: empresaStatus },
      })
      if (currentUnit?.id) {
        await apiRequest(`/unidades/${currentUnit.id}`, {
          method: 'PATCH',
          accessToken,
          body: {
            slaCorretivaHoras,
            slaPreventivaHoras,
            slaPreditivaHoras,
          },
        })
      }
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setIsLoading(false)
    }
  }

  const preencherCepEmpresa = async () => {
    if (normalizeCep(empresaCep).length !== 8) return
    setCepLoading(true)
    const result = await lookupCep(empresaCep)
    if (!result) {
      toast.error('CEP não encontrado.')
      setCepLoading(false)
      return
    }
    setEmpresaCep(result.cep)
    setEmpresaEndereco((prev) => prev || result.logradouro)
    setEmpresaBairro((prev) => prev || result.bairro)
    setEmpresaCidade((prev) => prev || result.localidade)
    setEmpresaEstado((prev) => prev || result.uf)
    setCepLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações da empresa e do sistema
        </p>
      </div>

      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList>
          <TabsTrigger value="empresa" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* Empresa Tab */}
        <TabsContent value="empresa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Dados básicos da sua empresa no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nome da empresa</Label>
                  <Input 
                    id="company-name" 
                    value={empresaNome}
                    onChange={(e) => setEmpresaNome(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-slug">URL da empresa</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">app.manucmms.com/</span>
                    <Input 
                      id="company-slug" 
                      value={empresaSlug}
                      onChange={(e) => setEmpresaSlug(e.target.value)}
                      className="flex-1"
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={empresaCnpj} onChange={(e) => setEmpresaCnpj(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      value={empresaCep}
                      onChange={(e) => {
                        const masked = formatCep(e.target.value)
                        setEmpresaCep(masked)
                        if (normalizeCep(masked).length === 8) {
                          void preencherCepEmpresa()
                        }
                      }}
                      onBlur={() => void preencherCepEmpresa()}
                      placeholder="00000-000"
                    />
                    <Button type="button" variant="outline" onClick={() => void preencherCepEmpresa()} disabled={cepLoading}>
                      {cepLoading ? '...' : 'Buscar'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input value={empresaEndereco} onChange={(e) => setEmpresaEndereco(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={empresaNumero} onChange={(e) => setEmpresaNumero(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={empresaBairro} onChange={(e) => setEmpresaBairro(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={empresaCidade} onChange={(e) => setEmpresaCidade(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={empresaEstado} maxLength={2} onChange={(e) => setEmpresaEstado(e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-2">
                  <Label>Contato nome</Label>
                  <Input value={contatoNome} onChange={(e) => setContatoNome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Contato email</Label>
                  <Input value={contatoEmail} onChange={(e) => setContatoEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Contato telefone</Label>
                  <Input value={contatoTelefone} onChange={(e) => setContatoTelefone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-status">Status da empresa</Label>
                <Select value={empresaStatus} onValueChange={(value) => setEmpresaStatus(value as 'ATIVA' | 'INATIVA' | 'SUSPENSA')}>
                  <SelectTrigger id="company-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVA">Ativa</SelectItem>
                    <SelectItem value="INATIVA">Inativa</SelectItem>
                    <SelectItem value="SUSPENSA">Suspensa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-description">Descrição</Label>
                <Textarea 
                  id="company-description"
                  placeholder="Descreva sua empresa..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso horário</Label>
                  <Select defaultValue="america-sao-paulo">
                    <SelectTrigger>
                      <Globe className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="america-sao-paulo">
                        América/São Paulo (GMT-3)
                      </SelectItem>
                      <SelectItem value="america-manaus">
                        América/Manaus (GMT-4)
                      </SelectItem>
                      <SelectItem value="america-recife">
                        América/Recife (GMT-3)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select defaultValue="pt-BR">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />
              <div className="space-y-3">
                <h3 className="text-base font-semibold">SLA da Unidade Atual</h3>
                <p className="text-sm text-muted-foreground">
                  Esses prazos são usados para marcar OS como atrasada automaticamente.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Corretiva (horas)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={8760}
                      value={slaCorretivaHoras}
                      onChange={(e) => setSlaCorretivaHoras(Number(e.target.value || 24))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preventiva (horas)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={8760}
                      value={slaPreventivaHoras}
                      onChange={(e) => setSlaPreventivaHoras(Number(e.target.value || 168))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preditiva (horas)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={8760}
                      value={slaPreditivaHoras}
                      onChange={(e) => setSlaPreditivaHoras(Number(e.target.value || 72))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações Tab */}
        <TabsContent value="notificacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como deseja receber alertas e notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba alertas importantes por email
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>OS críticas</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando uma OS crítica for criada
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>OS atrasadas</Label>
                  <p className="text-sm text-muted-foreground">
                    Alertar sobre ordens de serviço atrasadas
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Resumo diário</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber um resumo diário das atividades
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aparência Tab */}
        <TabsContent value="aparencia" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tema e Cores</CardTitle>
              <CardDescription>
                Personalize a aparência do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select defaultValue="dark">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Escuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo compacto</Label>
                  <p className="text-sm text-muted-foreground">
                    Reduzir espaçamento para mais conteúdo na tela
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segurança Tab */}
        <TabsContent value="seguranca" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Segurança</CardTitle>
              <CardDescription>
                Gerencie a segurança da sua conta e empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticação de dois fatores</Label>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma camada extra de segurança
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exigir 2FA para todos os usuários</Label>
                  <p className="text-sm text-muted-foreground">
                    Todos os usuários precisarão configurar 2FA
                  </p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Tempo de sessão</Label>
                <Select defaultValue="8h">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hora</SelectItem>
                    <SelectItem value="4h">4 horas</SelectItem>
                    <SelectItem value="8h">8 horas</SelectItem>
                    <SelectItem value="24h">24 horas</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Tempo máximo de inatividade antes do logout automático
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading || !canManageSettings}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {canManageSettings ? 'Salvar configurações' : 'Sem permissão'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
