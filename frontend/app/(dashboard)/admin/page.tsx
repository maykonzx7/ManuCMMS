"use client"

import { useEffect, useMemo, useState } from 'react'
import { Shield, Users, Building2, Send, Link2, Factory, Save, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiRequest } from '@/lib/api'
import { useAuth, useCurrentCompany } from '@/lib/auth'
import { formatCep, lookupCep, normalizeCep } from '@/lib/cep'
import { toast } from 'sonner'
import { PageDataLoading } from '@/components/shared'
import {
  ConvitesPanel,
  InviteLinkDialog,
  type ConviteActionResponse,
  type ConviteEmailStatus,
} from '@/components/convites/convites-panel'

type PainelResponse = {
  empresa: {
    id: string
    nomeEmpresa: string
    slug: string
    status: string
    cnpj?: string | null
    cep?: string | null
    endereco?: string | null
    numeroEndereco?: string | null
    bairro?: string | null
    cidade?: string | null
    estado?: string | null
    contatoNome?: string | null
    contatoEmail?: string | null
    contatoTelefone?: string | null
  }
  links: {
    acessoConta: string | null
  }
  usuarios: Array<{
    id: string
    nome: string
    usuarioAcesso: string | null
    email: string
    perfil: string
    status: string
    idUnidade: string
    unidadeNome: string
  }>
  cargos: Array<{
    id: string
    codigo: string
    nome: string
    descricao: string | null
    nivelHierarquico: number
    permissoes: string[]
  }>
}

type UnidadeItem = {
  id: string
  nome: string
  localizacao: string
  status?: string
  cep?: string | null
  endereco?: string | null
  numeroEndereco?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  complemento?: string | null
  referencia?: string | null
}

export default function AdminPage() {
  const { accessToken, session } = useAuth()
  const company = useCurrentCompany()
  const [painel, setPainel] = useState<PainelResponse | null>(null)
  const [unidades, setUnidades] = useState<UnidadeItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [emailDestino, setEmailDestino] = useState('')
  const [nomeDestino, setNomeDestino] = useState('')
  const [cargoCodigo, setCargoCodigo] = useState('')
  const [idUnidadeDestino, setIdUnidadeDestino] = useState('')
  const [novaBaseNome, setNovaBaseNome] = useState('')
  const [novaBaseLocalizacao, setNovaBaseLocalizacao] = useState('')
  const [novaBaseCep, setNovaBaseCep] = useState('')
  const [novaBaseEndereco, setNovaBaseEndereco] = useState('')
  const [novaBaseNumero, setNovaBaseNumero] = useState('')
  const [novaBaseBairro, setNovaBaseBairro] = useState('')
  const [novaBaseCidade, setNovaBaseCidade] = useState('')
  const [novaBaseEstado, setNovaBaseEstado] = useState('')
  const [novaBaseStatus, setNovaBaseStatus] = useState<'ATIVA' | 'INATIVA'>('ATIVA')
  const [empresaForm, setEmpresaForm] = useState({
    nomeEmpresa: '',
    cnpj: '',
    cep: '',
    endereco: '',
    numeroEndereco: '',
    bairro: '',
    cidade: '',
    estado: '',
    contatoNome: '',
    contatoEmail: '',
    contatoTelefone: '',
  })
  const [cepBaseLoading, setCepBaseLoading] = useState(false)
  const [cepEmpresaLoading, setCepEmpresaLoading] = useState(false)
  const [convitesRefreshKey, setConvitesRefreshKey] = useState(0)
  const [inviteLinkDialog, setInviteLinkDialog] = useState<{
    emailDestino: string
    link: string
    emailStatus?: ConviteEmailStatus
  } | null>(null)

  const empresaId = company?.id ?? session?.empresa?.id ?? null

  const carregarTudo = async () => {
    if (!accessToken || !empresaId) return
    setIsLoading(true)
    try {
      const [dataPainel, dataUnidades] = await Promise.all([
        apiRequest<PainelResponse>(`/empresas/${empresaId}/gestao/painel`, { accessToken }),
        apiRequest<UnidadeItem[]>('/unidades', { accessToken }),
      ])
      setPainel(dataPainel)
      setEmpresaForm({
        nomeEmpresa: dataPainel.empresa.nomeEmpresa ?? '',
        cnpj: dataPainel.empresa.cnpj ?? '',
        cep: dataPainel.empresa.cep ?? '',
        endereco: dataPainel.empresa.endereco ?? '',
        numeroEndereco: dataPainel.empresa.numeroEndereco ?? '',
        bairro: dataPainel.empresa.bairro ?? '',
        cidade: dataPainel.empresa.cidade ?? '',
        estado: dataPainel.empresa.estado ?? '',
        contatoNome: dataPainel.empresa.contatoNome ?? '',
        contatoEmail: dataPainel.empresa.contatoEmail ?? '',
        contatoTelefone: dataPainel.empresa.contatoTelefone ?? '',
      })
      setUnidades(dataUnidades)
      if (!cargoCodigo && dataPainel.cargos[0]?.codigo) {
        setCargoCodigo(dataPainel.cargos[0].codigo)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao carregar painel de gestão')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void carregarTudo()
  }, [accessToken, empresaId])

  const stats = useMemo(() => {
    const usuarios = painel?.usuarios ?? []
    return {
      total: usuarios.length,
      ativos: usuarios.filter((u) => u.status === 'ATIVO').length,
      bloqueados: usuarios.filter((u) => u.status === 'BLOQUEADO').length,
      bases: unidades.length,
    }
  }, [painel, unidades])

  const convidarUsuario = async () => {
    if (!accessToken || !empresaId) return
    if (!emailDestino.trim() || !cargoCodigo) {
      toast.error('Informe email e cargo para enviar convite.')
      return
    }

    try {
      const response = await apiRequest<ConviteActionResponse>(`/empresas/${empresaId}/convites`, {
        method: 'POST',
        accessToken,
        body: {
          emailDestino: emailDestino.trim().toLowerCase(),
          nomeDestino: nomeDestino.trim() || undefined,
          cargoCodigo,
          idUnidadeDestino: idUnidadeDestino || undefined,
        },
      })
      toast.success('Convite registrado com sucesso.')
      if (response.links?.convite) {
        setInviteLinkDialog({
          emailDestino: emailDestino.trim().toLowerCase(),
          link: response.links.convite,
          emailStatus: response.entregaEmail?.status,
        })
      }
      setEmailDestino('')
      setNomeDestino('')
      setConvitesRefreshKey((value) => value + 1)
      await carregarTudo()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao enviar convite')
    }
  }

  const criarBase = async () => {
    if (!accessToken) return
    if (!novaBaseNome.trim() || !novaBaseLocalizacao.trim()) {
      toast.error('Informe nome e localização da base.')
      return
    }
    try {
      await apiRequest('/unidades', {
        method: 'POST',
        accessToken,
        body: {
          nome: novaBaseNome.trim(),
          localizacao: novaBaseLocalizacao.trim(),
          status: novaBaseStatus,
          cep: novaBaseCep || undefined,
          endereco: novaBaseEndereco || undefined,
          numeroEndereco: novaBaseNumero || undefined,
          bairro: novaBaseBairro || undefined,
          cidade: novaBaseCidade || undefined,
          estado: novaBaseEstado || undefined,
        },
      })
      toast.success('Base criada com sucesso.')
      setNovaBaseNome('')
      setNovaBaseLocalizacao('')
      setNovaBaseCep('')
      setNovaBaseEndereco('')
      setNovaBaseNumero('')
      setNovaBaseBairro('')
      setNovaBaseCidade('')
      setNovaBaseEstado('')
      setNovaBaseStatus('ATIVA')
      await carregarTudo()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao criar base')
    }
  }

  const atualizarBase = async (unidade: UnidadeItem, patch: Partial<UnidadeItem>) => {
    if (!accessToken) return
    try {
      await apiRequest(`/unidades/${unidade.id}`, {
        method: 'PATCH',
        accessToken,
        body: {
          nome: patch.nome ?? unidade.nome,
          localizacao: patch.localizacao ?? unidade.localizacao,
          status: patch.status ?? (unidade.status ?? 'ATIVA'),
          cep: patch.cep ?? unidade.cep ?? null,
          endereco: patch.endereco ?? unidade.endereco ?? null,
          numeroEndereco: patch.numeroEndereco ?? unidade.numeroEndereco ?? null,
          bairro: patch.bairro ?? unidade.bairro ?? null,
          cidade: patch.cidade ?? unidade.cidade ?? null,
          estado: patch.estado ?? unidade.estado ?? null,
          complemento: patch.complemento ?? unidade.complemento ?? null,
          referencia: patch.referencia ?? unidade.referencia ?? null,
        },
      })
      toast.success('Base atualizada com sucesso.')
      await carregarTudo()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar base')
    }
  }

  const salvarDadosEmpresa = async () => {
    if (!accessToken || !empresaId) return
    try {
      await apiRequest(`/empresas/${empresaId}/gestao/dados`, {
        method: 'PATCH',
        accessToken,
        body: { ...empresaForm },
      })
      toast.success('Dados da empresa atualizados.')
      await carregarTudo()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao atualizar empresa')
    }
  }

  const preencherCepBase = async () => {
    if (normalizeCep(novaBaseCep).length !== 8) return
    setCepBaseLoading(true)
    const result = await lookupCep(novaBaseCep)
    if (!result) {
      toast.error('CEP não encontrado.')
      setCepBaseLoading(false)
      return
    }
    setNovaBaseCep(result.cep)
    setNovaBaseEndereco((prev) => prev || result.logradouro)
    setNovaBaseBairro((prev) => prev || result.bairro)
    setNovaBaseCidade((prev) => prev || result.localidade)
    setNovaBaseEstado((prev) => prev || result.uf)
    setCepBaseLoading(false)
  }

  const preencherCepEmpresa = async () => {
    if (normalizeCep(empresaForm.cep).length !== 8) return
    setCepEmpresaLoading(true)
    const result = await lookupCep(empresaForm.cep)
    if (!result) {
      toast.error('CEP da empresa não encontrado.')
      setCepEmpresaLoading(false)
      return
    }
    setEmpresaForm((prev) => ({
      ...prev,
      cep: result.cep,
      endereco: prev.endereco || result.logradouro,
      bairro: prev.bairro || result.bairro,
      cidade: prev.cidade || result.localidade,
      estado: prev.estado || result.uf,
    }))
    setCepEmpresaLoading(false)
  }

  if (isLoading && !painel) {
    return <PageDataLoading variant="dashboard" message="Carregando painel de gestão..." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Gestão</h1>
        <p className="text-muted-foreground">Criação e gestão de bases, convites e dados do cliente.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Usuários</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Ativos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.ativos}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Bloqueados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.bloqueados}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Bases</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.bases}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="bases" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bases"><Factory className="mr-2 h-4 w-4" />Bases</TabsTrigger>
          <TabsTrigger value="convites"><Send className="mr-2 h-4 w-4" />Convites</TabsTrigger>
          <TabsTrigger value="usuarios"><Users className="mr-2 h-4 w-4" />Usuários</TabsTrigger>
          <TabsTrigger value="empresa"><Building2 className="mr-2 h-4 w-4" />Empresa</TabsTrigger>
        </TabsList>

        <TabsContent value="bases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Criar Base</CardTitle>
              <CardDescription>Cadastre uma nova base/unidade para o cliente.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-6">
              <div className="space-y-2 md:col-span-1"><Label>Nome</Label><Input value={novaBaseNome} onChange={(e) => setNovaBaseNome(e.target.value)} placeholder="Ex: Base Recife" /></div>
              <div className="space-y-2 md:col-span-2"><Label>Localização</Label><Input value={novaBaseLocalizacao} onChange={(e) => setNovaBaseLocalizacao(e.target.value)} placeholder="Ex: Recife/PE - Polo Industrial" /></div>
              <div className="space-y-2 md:col-span-1">
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <Input
                    value={novaBaseCep}
                    onChange={(e) => {
                      const masked = formatCep(e.target.value)
                      setNovaBaseCep(masked)
                      if (normalizeCep(masked).length === 8) {
                        void preencherCepBase()
                      }
                    }}
                    onBlur={() => void preencherCepBase()}
                    placeholder="00000-000"
                  />
                  <Button type="button" variant="outline" onClick={() => void preencherCepBase()} disabled={cepBaseLoading}>
                    {cepBaseLoading ? '...' : 'Buscar'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 md:col-span-1"><Label>Cidade</Label><Input value={novaBaseCidade} onChange={(e) => setNovaBaseCidade(e.target.value)} placeholder="Cidade" /></div>
              <div className="space-y-2 md:col-span-1"><Label>UF</Label><Input value={novaBaseEstado} onChange={(e) => setNovaBaseEstado(e.target.value.toUpperCase())} placeholder="PE" maxLength={2} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Endereço</Label><Input value={novaBaseEndereco} onChange={(e) => setNovaBaseEndereco(e.target.value)} placeholder="Rua / Avenida" /></div>
              <div className="space-y-2 md:col-span-1"><Label>Número</Label><Input value={novaBaseNumero} onChange={(e) => setNovaBaseNumero(e.target.value)} placeholder="123" /></div>
              <div className="space-y-2 md:col-span-1"><Label>Bairro</Label><Input value={novaBaseBairro} onChange={(e) => setNovaBaseBairro(e.target.value)} placeholder="Bairro" /></div>
              <div className="space-y-2 md:col-span-1">
                <Label>Status</Label>
                <Select value={novaBaseStatus} onValueChange={(v) => setNovaBaseStatus(v as 'ATIVA' | 'INATIVA')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVA">ATIVA</SelectItem>
                    <SelectItem value="INATIVA">INATIVA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4 flex items-center gap-2">
                <Button onClick={() => void criarBase()} disabled={isLoading}>Criar Base</Button>
                <Button variant="outline" onClick={() => void carregarTudo()} disabled={isLoading}>Atualizar</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bases do Cliente</CardTitle>
              <CardDescription>Visualize e manipule dados principais das bases.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {unidades.map((unidade) => (
                <div key={unidade.id} className="rounded-md border p-3">
                  <div className="grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-4"><Label className="text-xs">Nome</Label><Input defaultValue={unidade.nome} onBlur={(e) => {
                      const nome = e.target.value.trim()
                      if (nome && nome !== unidade.nome) void atualizarBase(unidade, { nome })
                    }} /></div>
                    <div className="md:col-span-4"><Label className="text-xs">Localização</Label><Input defaultValue={unidade.localizacao} onBlur={(e) => {
                      const localizacao = e.target.value.trim()
                      if (localizacao && localizacao !== unidade.localizacao) void atualizarBase(unidade, { localizacao })
                    }} /></div>
                    <div className="md:col-span-2"><Label className="text-xs">CEP</Label><Input defaultValue={unidade.cep ?? ''} onBlur={(e) => void atualizarBase(unidade, { cep: e.target.value.trim() })} /></div>
                    <div className="md:col-span-3"><Label className="text-xs">Endereço</Label><Input defaultValue={unidade.endereco ?? ''} onBlur={(e) => void atualizarBase(unidade, { endereco: e.target.value.trim() })} /></div>
                    <div className="md:col-span-1"><Label className="text-xs">Nº</Label><Input defaultValue={unidade.numeroEndereco ?? ''} onBlur={(e) => void atualizarBase(unidade, { numeroEndereco: e.target.value.trim() })} /></div>
                    <div className="md:col-span-2"><Label className="text-xs">Cidade</Label><Input defaultValue={unidade.cidade ?? ''} onBlur={(e) => void atualizarBase(unidade, { cidade: e.target.value.trim() })} /></div>
                    <div className="md:col-span-2"><Label className="text-xs">Status</Label>
                      <Select value={(unidade.status ?? 'ATIVA').toUpperCase()} onValueChange={(v) => void atualizarBase(unidade, { status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ATIVA">ATIVA</SelectItem>
                          <SelectItem value="INATIVA">INATIVA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1 flex items-end"><Button size="icon" variant="outline" onClick={() => void carregarTudo()}><Save className="h-4 w-4" /></Button></div>
                  </div>
                </div>
              ))}
              {unidades.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma base cadastrada.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="convites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Convidar Usuário para Base</CardTitle>
              <CardDescription>
                O convite é criado na hora. Se o e-mail não estiver configurado, copie o link gerado e envie manualmente.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Email destino</Label><Input value={emailDestino} onChange={(e) => setEmailDestino(e.target.value)} placeholder="usuario@empresa.com" /></div>
              <div className="space-y-2"><Label>Nome destino (opcional)</Label><Input value={nomeDestino} onChange={(e) => setNomeDestino(e.target.value)} placeholder="Nome do usuário" /></div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select value={cargoCodigo} onValueChange={setCargoCodigo}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                  <SelectContent>
                    {(painel?.cargos ?? []).map((cargo) => (
                      <SelectItem key={cargo.id} value={cargo.codigo}>{cargo.nome} ({cargo.codigo})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Base/Unidade</Label>
                <Select value={idUnidadeDestino || '__none__'} onValueChange={(value) => setIdUnidadeDestino(value === '__none__' ? '' : value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione a base" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem unidade específica</SelectItem>
                    {unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id}>{unidade.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Button onClick={() => void convidarUsuario()} disabled={isLoading}>Enviar convite</Button>
                <Button variant="outline" onClick={() => void carregarTudo()} disabled={isLoading}>Atualizar dados</Button>
              </div>
            </CardContent>
          </Card>

          {empresaId && accessToken ? (
            <ConvitesPanel
              empresaId={empresaId}
              accessToken={accessToken}
              refreshKey={convitesRefreshKey}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários da Empresa</CardTitle>
              <CardDescription>Visão consolidada de perfis e bases.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(painel?.usuarios ?? []).map((u) => (
                  <div key={u.id} className="rounded-md border p-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium">{u.nome}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{u.perfil}</Badge>
                        <Badge variant="outline">{u.status}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{u.email} • {u.unidadeNome}</p>
                  </div>
                ))}
                {(painel?.usuarios ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="empresa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Dados da Empresa</CardTitle>
              <CardDescription>Informações operacionais do cliente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div><Label>Nome da empresa</Label><Input value={empresaForm.nomeEmpresa} onChange={(e) => setEmpresaForm((p) => ({ ...p, nomeEmpresa: e.target.value }))} /></div>
                <div><Label>CNPJ</Label><Input value={empresaForm.cnpj} onChange={(e) => setEmpresaForm((p) => ({ ...p, cnpj: e.target.value }))} /></div>
                <div>
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      value={empresaForm.cep}
                      onChange={(e) => {
                        const masked = formatCep(e.target.value)
                        setEmpresaForm((p) => ({ ...p, cep: masked }))
                        if (normalizeCep(masked).length === 8) {
                          void preencherCepEmpresa()
                        }
                      }}
                      onBlur={() => void preencherCepEmpresa()}
                      placeholder="00000-000"
                    />
                    <Button type="button" variant="outline" onClick={() => void preencherCepEmpresa()} disabled={cepEmpresaLoading}>
                      {cepEmpresaLoading ? '...' : 'Buscar'}
                    </Button>
                  </div>
                </div>
                <div><Label>Endereço</Label><Input value={empresaForm.endereco} onChange={(e) => setEmpresaForm((p) => ({ ...p, endereco: e.target.value }))} /></div>
                <div><Label>Número</Label><Input value={empresaForm.numeroEndereco} onChange={(e) => setEmpresaForm((p) => ({ ...p, numeroEndereco: e.target.value }))} /></div>
                <div><Label>Bairro</Label><Input value={empresaForm.bairro} onChange={(e) => setEmpresaForm((p) => ({ ...p, bairro: e.target.value }))} /></div>
                <div><Label>Cidade</Label><Input value={empresaForm.cidade} onChange={(e) => setEmpresaForm((p) => ({ ...p, cidade: e.target.value }))} /></div>
                <div><Label>UF</Label><Input value={empresaForm.estado} maxLength={2} onChange={(e) => setEmpresaForm((p) => ({ ...p, estado: e.target.value.toUpperCase() }))} /></div>
                <div><Label>Contato nome</Label><Input value={empresaForm.contatoNome} onChange={(e) => setEmpresaForm((p) => ({ ...p, contatoNome: e.target.value }))} /></div>
                <div><Label>Contato email</Label><Input value={empresaForm.contatoEmail} onChange={(e) => setEmpresaForm((p) => ({ ...p, contatoEmail: e.target.value }))} /></div>
                <div><Label>Contato telefone</Label><Input value={empresaForm.contatoTelefone} onChange={(e) => setEmpresaForm((p) => ({ ...p, contatoTelefone: e.target.value }))} /></div>
              </div>
              <p><strong>Slug:</strong> {painel?.empresa.slug ?? '-'}</p>
              <p><strong>Status:</strong> <Badge variant="outline">{painel?.empresa.status ?? '-'}</Badge></p>
              <Button onClick={() => void salvarDadosEmpresa()} disabled={isLoading}>Salvar dados da empresa</Button>
              {painel?.links.acessoConta ? (
                <a className="inline-flex items-center text-primary hover:underline" href={painel.links.acessoConta} target="_blank" rel="noreferrer">
                  <Link2 className="mr-2 h-4 w-4" /> Link de acesso da empresa
                </a>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <InviteLinkDialog
        open={Boolean(inviteLinkDialog)}
        onOpenChange={(open) => !open && setInviteLinkDialog(null)}
        emailDestino={inviteLinkDialog?.emailDestino ?? ''}
        link={inviteLinkDialog?.link ?? ''}
        emailStatus={inviteLinkDialog?.emailStatus}
      />
    </div>
  )
}
