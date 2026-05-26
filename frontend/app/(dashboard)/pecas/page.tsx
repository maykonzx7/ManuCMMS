'use client'

import { useEffect, useState } from 'react'
import { Plus, Package, AlertTriangle, Pencil, Trash2, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { toast } from 'sonner'

type ApiPeca = {
  id: string
  idUnidade: string
  codigo: string
  nome: string
  quantidadeEstoque: number
  quantidadeMinima: number
}

type ApiMovimentacao = {
  pecaId: string
  pecaCodigo: string
  pecaNome: string
  ordemServicoId: string
  quantidade: number
  createdAt: string
}

export default function PecasPage() {
  const { accessToken } = useAuth()
  const unit = useCurrentUnit()
  const [pecas, setPecas] = useState<ApiPeca[]>([])
  const [movimentacoes, setMovimentacoes] = useState<ApiMovimentacao[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ApiPeca | null>(null)
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [quantidadeEstoque, setQuantidadeEstoque] = useState('0')
  const [quantidadeMinima, setQuantidadeMinima] = useState('0')

  const loadPecas = async () => {
    if (!accessToken || !unit?.id) return
    setLoading(true)
    try {
      const res = await apiRequest<ApiPeca[]>(`/unidades/${unit.id}/pecas`, { accessToken })
      setPecas(res)
    } catch (e) {
      setPecas([])
      toast.error(e instanceof Error ? e.message : 'Falha ao carregar peças')
    } finally {
      setLoading(false)
    }
  }

  const loadMovimentacoes = async () => {
    if (!accessToken || !unit?.id) return
    try {
      const res = await apiRequest<ApiMovimentacao[]>(
        `/unidades/${unit.id}/pecas/movimentacoes`,
        { accessToken },
      )
      setMovimentacoes(res)
    } catch {
      setMovimentacoes([])
    }
  }

  useEffect(() => {
    void loadPecas()
    void loadMovimentacoes()
  }, [accessToken, unit?.id])

  const openCreate = () => {
    setEditing(null)
    setCodigo('')
    setNome('')
    setQuantidadeEstoque('0')
    setQuantidadeMinima('0')
    setDialogOpen(true)
  }

  const openEdit = (peca: ApiPeca) => {
    setEditing(peca)
    setCodigo(peca.codigo)
    setNome(peca.nome)
    setQuantidadeEstoque(String(peca.quantidadeEstoque))
    setQuantidadeMinima(String(peca.quantidadeMinima))
    setDialogOpen(true)
  }

  const savePeca = async () => {
    if (!accessToken || !unit?.id) return
    const body = {
      codigo: codigo.trim(),
      nome: nome.trim(),
      quantidadeEstoque: Number(quantidadeEstoque) || 0,
      quantidadeMinima: Number(quantidadeMinima) || 0,
    }
    try {
      if (editing) {
        await apiRequest<ApiPeca>(`/unidades/${unit.id}/pecas/${editing.id}`, {
          method: 'PATCH',
          accessToken,
          body,
        })
        toast.success('Peça atualizada.')
      } else {
        await apiRequest<ApiPeca>(`/unidades/${unit.id}/pecas`, {
          method: 'POST',
          accessToken,
          body,
        })
        toast.success('Peça cadastrada.')
      }
      setDialogOpen(false)
      await loadPecas()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar peça')
    }
  }

  const removePeca = async (peca: ApiPeca) => {
    if (!accessToken || !unit?.id) return
    if (!window.confirm(`Excluir peça ${peca.codigo}?`)) return
    try {
      await apiRequest(`/unidades/${unit.id}/pecas/${peca.id}`, {
        method: 'DELETE',
        accessToken,
      })
      toast.success('Peça excluída.')
      await loadPecas()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao excluir peça')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Peças e Estoque</h1>
          <p className="text-muted-foreground">Cadastro, saldo e saídas por fechamento de OS</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova peça
        </Button>
      </div>

      <Tabs defaultValue="inventario">
        <TabsList>
          <TabsTrigger value="inventario">Inventário</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="inventario">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Inventário
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : pecas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma peça cadastrada nesta unidade.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Mínimo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pecas.map((peca) => {
                      const baixo = peca.quantidadeEstoque <= peca.quantidadeMinima
                      return (
                        <TableRow key={peca.id}>
                          <TableCell className="font-medium">{peca.codigo}</TableCell>
                          <TableCell>{peca.nome}</TableCell>
                          <TableCell>{peca.quantidadeEstoque}</TableCell>
                          <TableCell>{peca.quantidadeMinima}</TableCell>
                          <TableCell>
                            {baixo ? (
                              <Badge variant="outline" className="border-amber-500 text-amber-600">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Baixo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(peca)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => void removePeca(peca)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Saídas (fechamento de OS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {movimentacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Peça</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>OS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimentacoes.map((m, i) => (
                      <TableRow key={`${m.ordemServicoId}-${m.pecaId}-${i}`}>
                        <TableCell>{new Date(m.createdAt).toLocaleString('pt-BR')}</TableCell>
                        <TableCell>
                          {m.pecaCodigo} — {m.pecaNome}
                        </TableCell>
                        <TableCell>{m.quantidade}</TableCell>
                        <TableCell className="font-mono text-xs">{m.ordemServicoId.slice(0, 8)}…</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar peça' : 'Cadastrar peça'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ROL-001" />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Rolamento 6205" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estoque</Label>
                <Input type="number" min="0" value={quantidadeEstoque} onChange={(e) => setQuantidadeEstoque(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estoque mínimo</Label>
                <Input type="number" min="0" value={quantidadeMinima} onChange={(e) => setQuantidadeMinima(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => void savePeca()}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
