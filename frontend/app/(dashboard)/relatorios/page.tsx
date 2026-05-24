"use client"

import { useMemo, useState } from 'react'
import { Download, FileText, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useAuth, useCurrentUnit } from '@/lib/auth'
import { resolveApiBaseUrl } from '@/lib/api'

export default function RelatoriosPage() {
  const { isAuthenticated } = useAuth()
  const unit = useCurrentUnit()
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [formato, setFormato] = useState<'pdf' | 'excel'>('pdf')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canExport = useMemo(() => Boolean(isAuthenticated && unit?.id && from && to), [isAuthenticated, unit?.id, from, to])

  const exportar = async () => {
    if (!canExport || !unit?.id) return
    setIsLoading(true)
    setError(null)

    try {
      const query = new URLSearchParams({
        formato,
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
        unidadeId: unit.id,
      })

      const res = await fetch(`${resolveApiBaseUrl()}/relatorios/export?${query.toString()}`, {
        credentials: 'include',
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.message || `Falha ao exportar (${res.status})`)
      }

      const blob = await res.blob()
      const extension = formato === 'excel' ? 'csv' : 'pdf'
      const fileName = `relatorio_${unit.nome.replace(/\s+/g, '_').toLowerCase()}_${from}_${to}.${extension}`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao exportar relatório')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Exportação real via endpoint do backend</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exportar relatório da unidade
          </CardTitle>
          <CardDescription>
            A API gera relatório em PDF ou CSV para o período informado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data final</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={formato} onValueChange={(v) => setFormato(v as 'pdf' | 'excel')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p><strong>Unidade:</strong> {unit?.nome || 'Não selecionada'}</p>
            <p><strong>Período:</strong> {from} até {to}</p>
            <p><strong>Permissão:</strong> requer `os.visualizar_unidade`</p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button onClick={() => void exportar()} disabled={!canExport || isLoading}>
            <Download className="mr-2 h-4 w-4" />
            {isLoading ? 'Gerando...' : 'Gerar e baixar relatório'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Observação operacional</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Histórico e agendamento de relatórios ainda não possuem endpoint dedicado no backend atual.
          Esta tela agora opera somente com dados reais e exportação real.
        </CardContent>
      </Card>
    </div>
  )
}
