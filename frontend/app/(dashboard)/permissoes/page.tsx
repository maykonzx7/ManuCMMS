'use client'

import { useEffect, useMemo, useState } from 'react'
import { Shield, Check, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth, useCurrentCompany } from '@/lib/auth'
import { apiRequest } from '@/lib/api'

type BackendMe = {
  usuario: {
    perfil: string
    permissoes: string[]
    cargos: Array<{
      codigo: string
      nome: string
      idUnidade: string | null
    }>
  } | null
}

type PainelResponse = {
  cargos: Array<{
    id: string
    codigo: string
    nome: string
    nivelHierarquico: number
    permissoes: string[]
  }>
  permissoes: Array<{
    id: string
    codigo: string
    nome: string
    modulo: string
  }>
}

export default function PermissionsPage() {
  const { accessToken } = useAuth()
  const company = useCurrentCompany()
  const [me, setMe] = useState<BackendMe | null>(null)
  const [painel, setPainel] = useState<PainelResponse | null>(null)
  const [novoCodigo, setNovoCodigo] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoNivel, setNovoNivel] = useState('15')
  const [novoPermissoes, setNovoPermissoes] = useState<string[]>([])

  const loadPainel = async () => {
    if (!accessToken || !company?.id) return
    try {
      const res = await apiRequest<PainelResponse>(`/empresas/${company.id}/gestao/painel`, { accessToken })
      setPainel(res)
    } catch {
      setPainel(null)
    }
  }

  useEffect(() => {
    if (!accessToken) return
    void apiRequest<BackendMe>('/me', { accessToken })
      .then(setMe)
      .catch(() => setMe(null))
  }, [accessToken])

  useEffect(() => {
    void loadPainel()
  }, [accessToken, company?.id])

  const onCriarCargo = async () => {
    if (!accessToken || !company?.id || !painel) return
    if (!novoCodigo.trim() || !novoNome.trim()) {
      toast.error('Informe código e nome do cargo')
      return
    }
    try {
      await apiRequest(`/empresas/${company.id}/gestao/cargos`, {
        method: 'POST',
        accessToken,
        body: {
          codigo: novoCodigo.trim().toUpperCase(),
          nome: novoNome.trim(),
          nivelHierarquico: Number(novoNivel),
          permissoes: novoPermissoes,
        },
      })
      toast.success('Cargo personalizado criado')
      setNovoCodigo('')
      setNovoNome('')
      setNovoNivel('15')
      setNovoPermissoes([])
      await loadPainel()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao criar cargo')
    }
  }

  const permissoesAtuais = useMemo(() => me?.usuario?.permissoes ?? [], [me])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Permissões</h1>
        <p className="text-muted-foreground">Dados reais de permissões e cargos vindos do backend</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Contexto do usuário autenticado</CardTitle>
          <CardDescription>Perfil atual e permissões efetivas no token corporativo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Perfil: {me?.usuario?.perfil || 'N/D'}</Badge>
            <Badge variant="outline">Permissões efetivas: {permissoesAtuais.length}</Badge>
            <Badge variant="outline">Cargos vinculados: {me?.usuario?.cargos?.length || 0}</Badge>
          </div>

          {permissoesAtuais.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {permissoesAtuais.map((perm) => (
                <div key={perm} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="font-mono">{perm}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma permissão efetiva retornada.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Matriz de Cargos da Empresa</CardTitle>
            {painel ? (
              <Button size="sm" onClick={() => void onCriarCargo()}>
                Criar Cargo Personalizado
              </Button>
            ) : null}
          </div>
          <CardDescription>
            Fonte: endpoint de gestão da empresa (`/empresas/:id/gestao/painel`).
          </CardDescription>
        </CardHeader>
        {painel ? (
          <CardContent className="space-y-4 border-b pb-6">
            <div className="grid gap-3 md:grid-cols-3">
              <Input placeholder="Código (ex: TEC_PLANEJADOR)" value={novoCodigo} onChange={(e) => setNovoCodigo(e.target.value)} />
              <Input placeholder="Nome do cargo" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
              <Input type="number" min={1} max={100} placeholder="Nível" value={novoNivel} onChange={(e) => setNovoNivel(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {painel.permissoes.map((perm) => {
                const checked = novoPermissoes.includes(perm.codigo)
                return (
                  <Button
                    key={perm.id}
                    size="sm"
                    variant={checked ? 'default' : 'outline'}
                    onClick={() =>
                      setNovoPermissoes((prev) =>
                        checked ? prev.filter((item) => item !== perm.codigo) : [...prev, perm.codigo],
                      )
                    }
                  >
                    {perm.codigo}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        ) : null}
        <CardContent>
          {painel ? (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Permissões</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {painel.cargos.map((cargo) => (
                    <TableRow key={cargo.id}>
                      <TableCell>
                        <div className="font-medium">{cargo.nome}</div>
                        <div className="text-xs text-muted-foreground font-mono">{cargo.codigo}</div>
                      </TableCell>
                      <TableCell>{cargo.nivelHierarquico}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {cargo.permissoes.length > 0 ? cargo.permissoes.map((perm) => (
                            <Badge key={`${cargo.id}-${perm}`} variant="secondary" className="font-mono text-xs">{perm}</Badge>
                          )) : <span className="text-xs text-muted-foreground">Sem permissões</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Não foi possível carregar a matriz empresarial. Essa consulta exige permissão `empresa.gerenciar`.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
