'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { User, Company, Unit, SessionData } from '@/types'
import { apiRequest, setApiCompanySlug } from '@/lib/api'
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

interface AuthContextType {
  session: SessionData | null
  isAuthenticated: boolean
  isLoading: boolean
  accessToken: string | null
  isPlatformOperator: boolean
  login: (email: string, senha: string, empresaSlug?: string) => Promise<void>
  loginWithGoogle: (empresaSlug?: string, redirectPath?: string) => Promise<void>
  requestPasswordReset: (email: string, redirectPath?: string) => Promise<void>
  updatePassword: (novaSenha: string) => Promise<void>
  logout: () => Promise<void>
  setUnidadeAtual: (unidade: Unit) => void
  refreshSession: () => Promise<void>
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

function resolvePreferredCompanySlug(explicitSlug?: string | null): string | null {
  const normalizedExplicit = (explicitSlug ?? '').trim().toLowerCase()
  if (normalizedExplicit) return normalizedExplicit
  if (typeof window === 'undefined') return null
  return resolveCompanySlugFromPathname(window.location.pathname)
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

  const hydrateFromSupabase = useCallback(async (currentSession: Session | null, preferredCompanySlug?: string | null) => {
    if (!currentSession?.access_token) {
      setSessionData(null)
      setAccessToken(null)
      setIsPlatformOperator(false)
      setApiCompanySlug(null)
      return
    }

    const token = currentSession.access_token
    const companySlug = resolvePreferredCompanySlug(preferredCompanySlug)
    const headers = companySlug ? { 'x-company-slug': companySlug } : undefined
    await apiRequest('/auth/session', {
      method: 'POST',
      body: { accessToken: token },
      headers,
    })
    setAccessToken(token)
    const me = await apiRequest<BackendMe>('/me', { accessToken: token, headers })
    const unidades = await apiRequest<BackendUnit[]>('/unidades', { accessToken: token, headers })
    const nextSession = toSessionData(me, unidades)
    setSessionData(nextSession)
    setApiCompanySlug(nextSession?.empresa.slug)
    setIsPlatformOperator(false)

    // Evita reprocessar hash OAuth antigo em refreshes seguintes.
    if (
      typeof window !== 'undefined' &&
      (window.location.hash.includes('access_token=') || window.location.hash === '#')
    ) {
      const cleanUrl = `${window.location.pathname}${window.location.search}`
      window.history.replaceState({}, document.title, cleanUrl)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        await hydrateFromSupabase(data.session ?? null)
      })
      .catch((error) => {
        console.warn('[auth] falha ao recuperar sessao inicial', error)
        setSessionData(null)
        setAccessToken(null)
        setIsPlatformOperator(false)
        setApiCompanySlug(null)
      })
      .finally(() => {
        setIsLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrateFromSupabase(nextSession).catch((error) => {
        console.warn('[auth] falha ao hidratar sessao apos evento', error)
        setSessionData(null)
        setAccessToken(null)
        setIsPlatformOperator(false)
        setApiCompanySlug(null)
      })
    })

    return () => subscription.unsubscribe()
  }, [hydrateFromSupabase])

  const login = useCallback(async (email: string, senha: string, empresaSlug?: string) => {
    if (!supabase) {
      throw new Error('Supabase nao configurado')
    }

    setIsLoading(true)
    try {
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

      await hydrateFromSupabase(data.session, empresaSlug ?? null)
    } finally {
      setIsLoading(false)
    }
  }, [hydrateFromSupabase])

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
    setSessionData(null)
    setAccessToken(null)
    setIsPlatformOperator(false)
    setApiCompanySlug(null)
  }, [])

  const setUnidadeAtual = useCallback((unidade: Unit) => {
    setSessionData((prev) => (prev ? { ...prev, unidadeAtual: unidade } : prev))
  }, [])

  const refreshSession = useCallback(async () => {
    if (!accessToken) return
    const companySlug = sessionData?.empresa.slug ?? null
    const headers = companySlug ? { 'x-company-slug': companySlug } : undefined
    const me = await apiRequest<BackendMe>('/me', { accessToken, headers })
    const unidades = await apiRequest<BackendUnit[]>('/unidades', { accessToken, headers })
    const nextSession = toSessionData(me, unidades)
    if (nextSession) {
      setSessionData((prev) => ({
        ...nextSession,
        unidadeAtual: prev?.unidadeAtual ?? nextSession.unidadeAtual,
      }))
    }
  }, [accessToken, sessionData?.empresa.slug])

  const value = useMemo<AuthContextType>(() => ({
    session: sessionData,
    isAuthenticated: !!sessionData,
    isLoading,
    accessToken,
    isPlatformOperator,
    login,
    loginWithGoogle,
    requestPasswordReset,
    updatePassword,
    logout,
    setUnidadeAtual,
    refreshSession,
  }), [accessToken, isLoading, isPlatformOperator, login, loginWithGoogle, requestPasswordReset, updatePassword, logout, sessionData, setUnidadeAtual, refreshSession])

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
