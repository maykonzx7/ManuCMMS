'use client'

import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { resolveApiBaseUrl } from '@/lib/api'

type RealtimeHandlers = {
  onNotificacaoNova?: (payload: {
    id: string
    tipo: 'info' | 'warning' | 'error' | 'success'
    titulo: string
    mensagem: string
    fotoUrl: string | null
    linkPath: string | null
    lidaEm: string | null
    createdAt: string
  }) => void
  onOrdemStatus?: (payload: {
    id: string
    idUnidade: string
    status: string
    tipo?: string
    prioridade?: string
    idAtivo?: string
    idTecnico?: string | null
    updatedAt: string
  }) => void
  onReady?: () => void
}

function resolveRealtimeUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '')
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured
  }

  const apiBase = resolveApiBaseUrl()
  if (/^https?:\/\//i.test(apiBase)) {
    return apiBase.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    console.warn(
      '[realtime] NEXT_PUBLIC_API_BASE_URL ausente; WebSocket requer URL absoluta da API (ex.: https://manucmms.onrender.com).',
    )
  }

  return ''
}

export function useRealtimeConnection(
  accessToken: string | null,
  companySlug: string | null | undefined,
  handlers: RealtimeHandlers,
) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!accessToken) return

    const baseUrl = resolveRealtimeUrl()
    if (!baseUrl) return

    const socket: Socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket', 'polling'],
      auth: {
        token: accessToken,
        companySlug: companySlug ?? undefined,
      },
    })

    socket.on('realtime.ready', () => {
      handlersRef.current.onReady?.()
    })

    socket.on('notificacao.nova', (payload) => {
      handlersRef.current.onNotificacaoNova?.(payload)
    })

    socket.on('ordem_servico.status', (payload) => {
      handlersRef.current.onOrdemStatus?.(payload)
    })

    return () => {
      socket.disconnect()
    }
  }, [accessToken, companySlug])
}
