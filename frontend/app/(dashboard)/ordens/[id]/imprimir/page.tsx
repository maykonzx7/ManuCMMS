'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OsPrintDocument } from '@/components/ordens/os-print-document'
import { PageDataLoading } from '@/components/shared'
import { useAuth, useCurrentCompany, useCurrentUnit } from '@/lib/auth'
import { apiRequest } from '@/lib/api'
import { mapApiOrdemToServiceOrder, type ApiOrdem, type ApiOrdemComentario } from '@/lib/backend-mappers'
import { ROUTES } from '@/lib/routes'

export default function OrdemImprimirPage() {
  const params = useParams()
  const { accessToken } = useAuth()
  const company = useCurrentCompany()
  const unit = useCurrentUnit()
  const [ordem, setOrdem] = useState<ApiOrdem | null>(null)
  const [comentarios, setComentarios] = useState<ApiOrdemComentario[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!accessToken || !unit?.id || typeof params.id !== 'string') return
    setIsLoading(true)
    void Promise.all([
      apiRequest<ApiOrdem>(`/unidades/${unit.id}/ordens-servico/${params.id}`, { accessToken }),
      apiRequest<ApiOrdemComentario[]>(
        `/unidades/${unit.id}/ordens-servico/${params.id}/comentarios`,
        { accessToken },
      ),
    ])
      .then(([orderRes, commentsRes]) => {
        setOrdem(orderRes)
        setComentarios(commentsRes)
      })
      .catch(() => {
        setOrdem(null)
        setComentarios([])
      })
      .finally(() => setIsLoading(false))
  }, [accessToken, params.id, unit?.id])

  const mapped = useMemo(() => {
    if (!ordem || !unit?.id) return null
    return mapApiOrdemToServiceOrder(ordem, unit.id)
  }, [ordem, unit?.id])

  const confirmacao = useMemo(() => {
    if (!ordem?.assinaturaDigital) return null
    try {
      const parsed = JSON.parse(ordem.assinaturaDigital) as {
        tipo?: string
        usuarioNome?: string | null
        usuarioFotoUrl?: string | null
        usuarioCargo?: string | null
        confirmadoEm?: string
        dataHora?: string
        dataUrl?: string
        nomeAssinante?: string | null
      }
      if (parsed.tipo === 'confirmacao') {
        return {
          nome: parsed.usuarioNome ?? ordem.finalizadoPorNome,
          fotoUrl: parsed.usuarioFotoUrl ?? null,
          cargo: parsed.usuarioCargo ?? null,
          perfil: null,
          data: parsed.confirmadoEm ?? parsed.dataHora ?? ordem.dataFechamento,
          legacyCanvas: null,
        }
      }
      if (parsed.tipo === 'canvas' && parsed.dataUrl) {
        return {
          nome: parsed.nomeAssinante ?? parsed.usuarioNome ?? ordem.finalizadoPorNome,
          fotoUrl: null,
          cargo: null,
          perfil: null,
          data: parsed.dataHora ?? ordem.dataFechamento,
          legacyCanvas: parsed.dataUrl,
        }
      }
    } catch {
      if (ordem.assinaturaDigital.startsWith('data:image')) {
        return {
          nome: ordem.finalizadoPorNome,
          fotoUrl: null,
          cargo: null,
          perfil: null,
          data: ordem.dataFechamento,
          legacyCanvas: ordem.assinaturaDigital,
        }
      }
    }
    return null
  }, [ordem])

  if (isLoading) {
    return <PageDataLoading message="Preparando documento..." />
  }

  if (!ordem || !mapped || !unit) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Ordem de serviço não encontrada.</p>
        <Button variant="link" asChild className="mt-4">
          <Link href={ROUTES.ordens}>Voltar às ordens</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="os-print-toolbar flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link href={`${ROUTES.ordens}/${params.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar à OS
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir documento
        </Button>
      </div>

      <OsPrintDocument
        ordem={ordem}
        comentarios={comentarios}
        numero={mapped.numero}
        status={mapped.status}
        unidadeNome={unit.nome}
        empresaNome={company?.nome ?? 'Empresa'}
        geradoEm={new Date().toISOString()}
        confirmacao={confirmacao}
      />
    </div>
  )
}
