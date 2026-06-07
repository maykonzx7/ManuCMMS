'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { User, Company, Unit, SessionData } from '@/types'
import { apiRequest, getApiCompanySlug, invalidateApiCache, setApiCompanySlug } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media-url'
import { supabase, supabaseConfig } from '@/lib/supabase'

type BackendMe = {
  email: string | null
  usuario: {
    id: string
    idUnidade: string
    nome: string
    email: string
    fotoUrl?: string | null
    perfil: string
    status?: string
    empresa: {
      id: string
      nomeEmpresa: string
      slug: string
    } | null
    cargos?: Array<{
      id: string
      codigo: string
      nome: string
      nivelHierarquico: number
    }>
  } | null
}

type BackendUnit = {
  id?: string
  idUnidade?: string
  nome: string
  localizacao: string
}

type BootstrapResponse = {
  email: string | null
  usuario: BackendMe['usuario']
  unidades: BackendUnit[]
}

const SESSION_CACHE_KEY = 'manucmms_session_cache_v1'
const SESSION_CACHE_TTL_MS = 10 * 60 * 1000

type SessionCachePayload = {
  token: string
  companySlug: string
  session: SessionData
  ts: number
}

function normalizeCompanySlug(slug?: string | null): string {
  return (slug ?? '').trim().toLowerCase()
}

function readSessionCache(token: string, companySlug?: string | null): SessionData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionCachePayload
    const expectedSlug = normalizeCompanySlug(companySlug)
    const cachedSlug = normalizeCompanySlug(parsed.companySlug)
    if (parsed.token !== token) return null
    if (cachedSlug !== expectedSlug) return null
    if (Date.now() - parsed.ts > SESSION_CACHE_TTL_MS) return null
    return parsed.session
  } catch {
    return null
  }
}

function writeSessionCache(
  token: string,
  session: SessionData,
  companySlug?: string | null,
) {
  if (typeof window === 'undefined') return
  try {
    const payload: SessionCachePayload = {
      token,
      companySlug: normalizeCompanySlug(companySlug ?? session.empresa.slug),
      session,
      ts: Date.now(),
    }
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // Cache é best-effort.
  }
}

function clearSessionCache() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY)
  } catch {
    // noop
  }
}

interface AuthContextType {
  session: SessionData | null
  isAuthenticated: boolean
  isLoading: boolean
  accessToken: string | null
  isPlatformOperator: boolean
  login: (email: string, senha: string, empresaSlug?: string) => Promise<void>
  completeInviteAccess: (
    email: string,
    senha: string,
    empresaSlug?: string,
    authSession?: { accessToken: string; refreshToken: string; expiresIn?: number },
  ) => Promise<void>
  loginWithGoogle: (empresaSlug?: string, redirectPath?: string) => Promise<void>
  requestPasswordReset: (email: string, redirectPath?: string) => Promise<void>
  updatePassword: (novaSenha: string) => Promise<void>
  logout: () => Promise<void>
  setUnidadeAtual: (unidade: Unit) => void
  refreshSession: () => Promise<void>
  enterCompanyWorkspace: (empresaSlug: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

function resolveCompanySlugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/(?:workspace\/)?acesso\/([^/?#]+)/i)
  const slug = match?.[1] ? decodeURIComponent(match[1]).trim().toLowerCase() : ''
  return slug.length > 0 ? slug : null
}

function isInviteAuthPath(pathname: string): boolean {
  return /\/(?:workspace\/)?convite(?:\/|$)/i.test(pathname)
}

function resolvePreferredCompanySlug(explicitSlug?: string | null): string | null {
  const normalizedExplicit = normalizeCompanySlug(explicitSlug)
  if (normalizedExplicit) return normalizedExplicit
  if (typeof window !== 'undefined') {
    const fromPath = resolveCompanySlugFromPathname(window.location.pathname)
    if (fromPath) return fromPath
  }
  return getApiCompanySlug()
}

function mapPerfil(perfil?: string | null): User['perfil'] {
  const normalized = (perfil ?? '').toUpperCase()
  if (normalized === 'TECNICO' || normalized === 'SUPERVISOR' || normalized === 'GESTOR' || normalized === 'AUDITOR' || normalized === 'ADMIN') {
    return normalized
  }
  return 'TECNICO'
}

function toSessionData(me: BackendMe, unidades: BackendUnit[]): SessionData | null {
  if (!me.usuario || !me.usuario.empresa) return null

  const mappedUnits: Unit[] = unidades
    .map((item) => {
      const resolvedId = item.id ?? item.idUnidade ?? ''
      if (!resolvedId) return null
      return {
        id: resolvedId,
        nome: item.nome,
        codigo: item.localizacao || resolvedId.slice(0, 8).toUpperCase(),
        empresaId: me.usuario!.empresa!.id,
        ativo: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })
    .filter((item): item is Unit => item !== null)

  const currentUnit = mappedUnits.find((item) => item.id === me.usuario!.idUnidade) ?? mappedUnits[0]

  const user: User = {
    id: me.usuario.id,
    nome: me.usuario.nome,
    email: me.usuario.email,
    avatar: resolveMediaUrl(me.usuario.fotoUrl) ?? undefined,
    cargoNome: me.usuario.cargos?.[0]?.nome,
    perfil: mapPerfil(me.usuario.perfil),
    ativo: (me.usuario.status ?? 'ATIVO').toUpperCase() === 'ATIVO',
    empresaId: me.usuario.empresa.id,
    unidadeId: me.usuario.idUnidade,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const company: Company = {
    id: me.usuario.empresa.id,
    nome: me.usuario.empresa.nomeEmpresa,
    slug: me.usuario.empresa.slug,
    plano: 'PROFESSIONAL',
    ativo: true,
    createdAt: new Date().toISOString(),
  }

  return {
    user,
    empresa: company,
    unidades: mappedUnits,
    unidadeAtual: currentUnit,
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(supabaseConfig.isConfigured)
  const [isPlatformOperator, setIsPlatformOperator] = useState(false)
  const syncedAuthContextRef = useRef<{ token: string; companySlug: string | null } | null>(null)
  const hydratingRef = useRef<Promise<void> | null>(null)
  const explicitAuthRef = useRef<string | null>(null)

  const syncPlatformOperatorStatus = useCallback(async (token: string) => {
    if (!token) {
      setIsPlatformOperator(false)
      return
    }
    try {
      await apiRequest('/platform/painel', { accessToken: token })
      setIsPlatformOperator(true)
    } catch {
      setIsPlatformOperator(false)
    }
  }, [])

  const applySession = useCallback((token: string, nextSession: SessionData | null) => {
    setAccessToken(token)
    setSessionData(nextSession)
    setApiCompanySlug(nextSession?.empresa.slug ?? null)
    if (nextSession) {
      writeSessionCache(token, nextSession, nextSession.empresa.slug)
    } else {
      clearSessionCache()
      setIsPlatformOperator(false)
    }
  }, [])

  const hydrateFromSupabase = useCallback(async (
    currentSession: Session | null,
    preferredCompanySlug?: string | null,
    options?: { intent?: 'login' | 'refresh'; useCache?: boolean },
  ) => {
    if (!currentSession?.access_token) {
      syncedAuthContextRef.current = null
      clearSessionCache()
      setSessionData(null)
      setAccessToken(null)
      setIsPlatformOperator(false)
      setApiCompanySlug(null)
      return
    }

    const token = currentSession.access_token
    const companySlug = resolvePreferredCompanySlug(preferredCompanySlug)
    const headers = companySlug ? { 'x-company-slug': companySlug } : undefined
    const intent = options?.intent ?? 'refresh'
    const cachedSession =
      options?.useCache === false ? null : readSessionCache(token, companySlug)

    if (cachedSession) {
      applySession(token, cachedSession)
    }

    const synced = syncedAuthContextRef.current
    const shouldSyncSession =
      synced?.token !== token || (synced?.companySlug ?? null) !== (companySlug ?? null)

    if (shouldSyncSession) {
      await apiRequest('/auth/session', {
        method: 'POST',
        body: { accessToken: token, intent },
        headers,
      })
    }

    const bootstrap = await apiRequest<BootstrapResponse>('/me/bootstrap', {
      accessToken: token,
      headers,
    })
    const nextSession = toSessionData(
      { email: bootstrap.email, usuario: bootstrap.usuario },
      bootstrap.unidades,
    )
    if (!nextSession) {
      throw new Error('Nao foi possivel carregar o workspace deste cliente.')
    }
    applySession(token, nextSession)
    syncedAuthContextRef.current = { token, companySlug: companySlug ?? null }
    await syncPlatformOperatorStatus(token)

    // Evita reprocessar hash OAuth antigo em refreshes seguintes.
    if (
      typeof window !== 'undefined' &&
      (window.location.hash.includes('access_token=') || window.location.hash === '#')
    ) {
      const cleanUrl = `${window.location.pathname}${window.location.search}`
      window.history.replaceState({}, document.title, cleanUrl)
    }
  }, [applySession, syncPlatformOperatorStatus])

  const clearLocalAuthState = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    await apiRequest('/auth/session', { method: 'DELETE' }).catch(() => undefined)
    explicitAuthRef.current = null
    syncedAuthContextRef.current = null
    hydratingRef.current = null
    clearSessionCache()
    applySession('', null)
    setAccessToken(null)
  }, [applySession])

  const runHydration = useCallback(async (
    currentSession: Session | null,
    preferredCompanySlug?: string | null,
    options?: { intent?: 'login' | 'refresh'; useCache?: boolean },
  ) => {
    const targetToken = currentSession?.access_token ?? ''
    const targetCompanySlug = resolvePreferredCompanySlug(preferredCompanySlug)

    if (hydratingRef.current) {
      try {
        await hydratingRef.current
      } catch {
        // Hidratação anterior falhou (ex.: token expirado); segue com a sessão atual.
      }
      const synced = syncedAuthContextRef.current
      if (
        synced?.token === targetToken &&
        targetToken &&
        (synced.companySlug ?? null) === (targetCompanySlug ?? null)
      ) {
        return
      }
    }

    const promise = hydrateFromSupabase(currentSession, preferredCompanySlug, options)
    hydratingRef.current = promise
    try {
      await promise
    } finally {
      if (hydratingRef.current === promise) {
        hydratingRef.current = null
      }
    }
  }, [hydrateFromSupabase])

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    const skipInitialHydration =
      typeof window !== 'undefined' && isInviteAuthPath(window.location.pathname)

    setIsLoading(true)
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (skipInitialHydration) {
          setIsLoading(false)
          return
        }

        const token = data.session?.access_token
        const initialCompanySlug = resolvePreferredCompanySlug()
        const cached = token ? readSessionCache(token, initialCompanySlug) : null
        if (cached) {
          applySession(token!, cached)
          setIsLoading(false)
        }
        await runHydration(data.session ?? null, initialCompanySlug ?? undefined, {
          useCache: true,
        })
      })
      .catch((error) => {
        console.warn('[auth] falha ao recuperar sessao inicial', error)
        syncedAuthContextRef.current = null
        applySession('', null)
        setAccessToken(null)
      })
      .finally(() => {
        setIsLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') return

      const nextToken = nextSession?.access_token ?? ''
      if (explicitAuthRef.current && explicitAuthRef.current === nextToken) {
        return
      }

      void runHydration(
        nextSession,
        getApiCompanySlug() ?? sessionData?.empresa.slug ?? undefined,
        { intent: event === 'SIGNED_IN' ? 'login' : 'refresh', useCache: false },
      ).catch((error) => {
        console.warn('[auth] falha ao hidratar sessao apos evento', error)
        syncedAuthContextRef.current = null
        applySession('', null)
        setAccessToken(null)
      })
    })

    return () => subscription.unsubscribe()
  }, [applySession, runHydration])

  const signInWithPassword = useCallback(async (
    email: string,
    senha: string,
    empresaSlug?: string,
  ) => {
    if (!supabase) {
      throw new Error('Supabase nao configurado')
    }

    let emailParaLogin = email.trim().toLowerCase()
    if (!emailParaLogin.includes('@')) {
      const resolved = await apiRequest<{ email: string }>('/auth/resolve-login', {
        method: 'POST',
        body: { identificador: emailParaLogin, companySlug: empresaSlug },
      })
      emailParaLogin = resolved.email.trim().toLowerCase()
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailParaLogin,
      password: senha,
    })
    if (error || !data.session?.access_token) {
      throw new Error(error?.message ?? 'Falha de autenticacao')
    }

    return data.session
  }, [])

  const login = useCallback(async (email: string, senha: string, empresaSlug?: string) => {
    setIsLoading(true)
    try {
      const session = await signInWithPassword(email, senha, empresaSlug)
      explicitAuthRef.current = session.access_token
      try {
        await runHydration(session, empresaSlug ?? null, { intent: 'login', useCache: false })
      } finally {
        explicitAuthRef.current = null
      }
    } finally {
      setIsLoading(false)
    }
  }, [runHydration, signInWithPassword])

  const completeInviteAccess = useCallback(async (
    email: string,
    senha: string,
    empresaSlug?: string,
    authSession?: { accessToken: string; refreshToken: string; expiresIn?: number },
  ) => {
    if (!supabase) {
      throw new Error('Supabase nao configurado')
    }

    setIsLoading(true)
    try {
      await clearLocalAuthState()
      if (empresaSlug) {
        setApiCompanySlug(empresaSlug)
      }

      let session: Session | null = null

      if (authSession?.accessToken && authSession.refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: authSession.accessToken,
          refresh_token: authSession.refreshToken,
        })
        if (error || !data.session?.access_token) {
          throw new Error(
            error?.message ?? 'Falha ao aplicar sessao retornada pelo servidor.',
          )
        }
        session = data.session
      } else {
        session = await signInWithPassword(email, senha, empresaSlug)
      }

      explicitAuthRef.current = session.access_token
      try {
        await runHydration(session, empresaSlug ?? null, { intent: 'login', useCache: false })
      } finally {
        explicitAuthRef.current = null
      }
    } finally {
      setIsLoading(false)
    }
  }, [clearLocalAuthState, runHydration, signInWithPassword])

  const loginWithGoogle = useCallback(async (empresaSlug?: string, redirectPath?: string) => {
    if (!supabase) {
      throw new Error('Supabase nao configurado')
    }

    const companyPath = empresaSlug
      ? `/workspace/acesso/${encodeURIComponent(empresaSlug)}`
      : '/workspace/acesso'
    const query = redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''
    const redirectTo = `${window.location.origin}${companyPath}${query}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (error) {
      throw new Error(error.message || 'Falha ao iniciar login com Google')
    }
  }, [])

  const requestPasswordReset = useCallback(async (email: string, redirectPath?: string) => {
    if (!supabase) {
      throw new Error('Supabase nao configurado')
    }

    let emailParaReset = email.trim().toLowerCase()
    if (!emailParaReset.includes('@')) {
      const resolved = await apiRequest<{ email: string }>('/auth/resolve-login', {
        method: 'POST',
        body: { identificador: emailParaReset },
      })
      emailParaReset = resolved.email.trim().toLowerCase()
    }

    const redirectTo = `${window.location.origin}${redirectPath ?? '/workspace/acesso/redefinir-senha'}`

    const { error } = await supabase.auth.resetPasswordForEmail(emailParaReset, {
      redirectTo,
    })

    if (error) {
      throw new Error(error.message || 'Nao foi possivel enviar o e-mail de recuperacao')
    }
  }, [])

  const updatePassword = useCallback(async (novaSenha: string) => {
    if (!supabase) {
      throw new Error('Supabase nao configurado')
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) {
      throw new Error(error.message || 'Nao foi possivel atualizar a senha')
    }
  }, [])

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    await apiRequest('/auth/session', { method: 'DELETE' }).catch(() => undefined)
    syncedAuthContextRef.current = null
    clearSessionCache()
    applySession('', null)
    setAccessToken(null)
  }, [applySession])

  const setUnidadeAtual = useCallback((unidade: Unit) => {
    setSessionData((prev) => (prev ? { ...prev, unidadeAtual: unidade } : prev))
  }, [])

  const refreshSession = useCallback(async () => {
    if (!accessToken) return
    const companySlug = sessionData?.empresa.slug ?? getApiCompanySlug()
    const headers = companySlug ? { 'x-company-slug': companySlug } : undefined
    const bootstrap = await apiRequest<BootstrapResponse>('/me/bootstrap', { accessToken, headers })
    const nextSession = toSessionData(
      { email: bootstrap.email, usuario: bootstrap.usuario },
      bootstrap.unidades,
    )
    if (nextSession) {
      const merged = {
        ...nextSession,
        unidadeAtual: sessionData?.unidadeAtual ?? nextSession.unidadeAtual,
      }
      setSessionData(merged)
      writeSessionCache(accessToken, merged, merged.empresa.slug)
    }
  }, [accessToken, sessionData?.empresa.slug, sessionData?.unidadeAtual])

  const enterCompanyWorkspace = useCallback(async (empresaSlug: string) => {
    if (!supabase) {
      throw new Error('Supabase nao configurado')
    }
    const normalizedSlug = empresaSlug.trim().toLowerCase()
    if (!normalizedSlug) {
      throw new Error('Slug da empresa invalido')
    }

    setIsLoading(true)
    try {
      const { data } = await supabase.auth.getSession()
      const currentSession = data.session
      if (!currentSession?.access_token) {
        throw new Error('Sessao nao encontrada')
      }
      setApiCompanySlug(normalizedSlug)
      invalidateApiCache()
      clearSessionCache()
      syncedAuthContextRef.current = null
      await runHydration(currentSession, normalizedSlug, {
        intent: 'login',
        useCache: false,
      })
    } finally {
      setIsLoading(false)
    }
  }, [runHydration])

  const value = useMemo<AuthContextType>(() => ({
    session: sessionData,
    isAuthenticated: !!sessionData,
    isLoading,
    accessToken,
    isPlatformOperator,
    login,
    completeInviteAccess,
    loginWithGoogle,
    requestPasswordReset,
    updatePassword,
    logout,
    setUnidadeAtual,
    refreshSession,
    enterCompanyWorkspace,
  }), [accessToken, isLoading, isPlatformOperator, login, completeInviteAccess, loginWithGoogle, requestPasswordReset, updatePassword, logout, sessionData, setUnidadeAtual, refreshSession, enterCompanyWorkspace])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export function useCurrentUser(): User | null {
  const { session } = useAuth()
  return session?.user ?? null
}

export function useCurrentCompany(): Company | null {
  const { session } = useAuth()
  return session?.empresa ?? null
}

export function useCurrentUnit(): Unit | null {
  const { session } = useAuth()
  return session?.unidadeAtual ?? null
}

export function useAvailableUnits(): Unit[] {
  const { session } = useAuth()
  return session?.unidades ?? []
}
