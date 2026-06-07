'use client'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'

type ActiveSessionPromptProps = {
  redirectPath: string
  onContinue: () => void
}

export function ActiveSessionPrompt({ redirectPath, onContinue }: ActiveSessionPromptProps) {
  const { session, logout } = useAuth()
  const userLabel = session?.user.nome ?? session?.user.email ?? 'usuário atual'

  const handleSwitchAccount = async () => {
    await logout()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">Sessão ativa</h2>
        <p className="text-muted-foreground">
          Este navegador já está conectado como <strong>{userLabel}</strong>.
        </p>
        <p className="text-sm text-muted-foreground">
          Em computadores compartilhados, saia antes de entrar com outra conta.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={onContinue}>Continuar como {userLabel}</Button>
        <Button variant="outline" onClick={() => void handleSwitchAccount()}>
          Sair e entrar com outra conta
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Destino após continuar: {redirectPath}
      </p>
    </div>
  )
}
