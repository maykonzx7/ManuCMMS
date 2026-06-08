'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { resolveApiBaseUrl } from '@/lib/api'

export type NotificacaoNovaPayload = {
  id: string
  tipo: 'info' | 'warning' | 'error' | 'success'
  titulo: string
  mensagem: string
  fotoUrl: string | null
  linkPath: string | null
  lidaEm: string | null
  createdAt: string
}

export type OrdemStatusPayload = {
  id: string
  idUnidade: string
  status: string
  tipo?: string
  prioridade?: string
  idAtivo?: string
  idTecnico?: string | null
  updatedAt: string
}

export type RealtimeHandlers = {
  onNotificacaoNova?: (payload: NotificacaoNovaPayload) => void
  onOrdemStatus?: (payload: OrdemStatusPayload) => void
  onReady?: () => void
}

type RealtimeContextValue = {
  subscribe: (subscriberId: string, handlers: RealtimeHandlers) => void
  unsubscribe: (subscriberId: string) => void
  isConnected: boolean
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

function resolveRealtimeUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '')
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured
  }

  const apiBase = resolveApiBaseUrl()
  if (/^https?:\/\//i.test(apiBase)) {
    return apiBase.replace(/\/$/, '')
  }

  return ''
}

type RealtimeProviderProps = {
  accessToken: string | null
  companySlug: string | null | undefined
  children: ReactNode
}

export function RealtimeProvider({
  accessToken,
  companySlug,
  children,
}: RealtimeProviderProps) {
  const subscribersRef = useRef(new Map<string, RealtimeHandlers>())
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const emitToSubscribers = useCallback(
    (event: keyof RealtimeHandlers, payload?: unknown) => {
      for (const handlers of subscribersRef.current.values()) {
        if (event === 'onReady') {
          handlers.onReady?.()
        } else if (event === 'onNotificacaoNova') {
          handlers.onNotificacaoNova?.(payload as NotificacaoNovaPayload)
        } else if (event === 'onOrdemStatus') {
          handlers.onOrdemStatus?.(payload as OrdemStatusPayload)
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (!accessToken) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setIsConnected(false)
      return
    }

    const baseUrl = resolveRealtimeUrl()
    if (!baseUrl) return

    const socket: Socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      reconnectionAttempts: Infinity,
      auth: {
        token: accessToken,
        companySlug: companySlug ?? undefined,
      },
    })

    socketRef.current = socket

    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('realtime.ready', () => emitToSubscribers('onReady'))
    socket.on('notificacao.nova', (payload) => emitToSubscribers('onNotificacaoNova', payload))
    socket.on('ordem_servico.status', (payload) => emitToSubscribers('onOrdemStatus', payload))

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [accessToken, companySlug, emitToSubscribers])

  const subscribe = useCallback((subscriberId: string, handlers: RealtimeHandlers) => {
    subscribersRef.current.set(subscriberId, handlers)
    if (socketRef.current?.connected) {
      handlers.onReady?.()
    }
  }, [])

  const unsubscribe = useCallback((subscriberId: string) => {
    subscribersRef.current.delete(subscriberId)
  }, [])

  const value = useMemo(
    () => ({ subscribe, unsubscribe, isConnected }),
    [isConnected, subscribe, unsubscribe],
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtimeSubscription(
  subscriberId: string,
  handlers: RealtimeHandlers,
) {
  const context = useContext(RealtimeContext)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!context) return

    context.subscribe(subscriberId, {
      onReady: () => handlersRef.current.onReady?.(),
      onNotificacaoNova: (payload) => handlersRef.current.onNotificacaoNova?.(payload),
      onOrdemStatus: (payload) => handlersRef.current.onOrdemStatus?.(payload),
    })

    return () => context.unsubscribe(subscriberId)
  }, [context, subscriberId])
}

/** @deprecated Use useRealtimeSubscription dentro do RealtimeProvider. */
export function useRealtimeConnection(
  accessToken: string | null,
  companySlug: string | null | undefined,
  handlers: RealtimeHandlers,
) {
  useRealtimeSubscription(
    `legacy-${accessToken?.slice(-8) ?? 'anon'}`,
    handlers,
  )
}
