'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, Company, Unit, SessionData } from '@/types'
import { mockSession, mockUnits } from '@/lib/mock-data'

interface AuthContextType {
  session: SessionData | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, senha: string, empresaSlug?: string) => Promise<void>
  logout: () => void
  setUnidadeAtual: (unidade: Unit) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Para desenvolvimento, iniciamos com sessão mock
  const [session, setSession] = useState<SessionData | null>(mockSession)
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (email: string, _senha: string, _empresaSlug?: string) => {
    setIsLoading(true)
    try {
      // Simula chamada de API
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      // Para desenvolvimento, usa sessão mock
      // Em produção, aqui faria a chamada real para a API
      setSession({
        ...mockSession,
        user: {
          ...mockSession.user,
          email,
        },
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setSession(null)
    // Em produção, também limparia o token do localStorage/cookies
  }, [])

  const setUnidadeAtual = useCallback((unidade: Unit) => {
    setSession((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        unidadeAtual: unidade,
      }
    })
  }, [])

  const value: AuthContextType = {
    session,
    isAuthenticated: !!session,
    isLoading,
    login,
    logout,
    setUnidadeAtual,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook para obter apenas o usuário atual
export function useCurrentUser(): User | null {
  const { session } = useAuth()
  return session?.user ?? null
}

// Hook para obter a empresa atual
export function useCurrentCompany(): Company | null {
  const { session } = useAuth()
  return session?.empresa ?? null
}

// Hook para obter a unidade atual
export function useCurrentUnit(): Unit | null {
  const { session } = useAuth()
  return session?.unidadeAtual ?? null
}

// Hook para obter todas as unidades disponíveis
export function useAvailableUnits(): Unit[] {
  const { session } = useAuth()
  return session?.unidades ?? mockUnits
}
