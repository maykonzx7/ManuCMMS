import type { ReactNode } from 'react'
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo - Branding */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-primary/20 via-background to-background p-12">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-balance">
            Gestão de Manutenção Industrial Inteligente
          </h1>
          <p className="text-lg text-muted-foreground text-pretty">
            Otimize suas operações de manutenção com controle total sobre ativos, 
            ordens de serviço e equipes técnicas em uma única plataforma.
          </p>
          
          <div className="grid grid-cols-2 gap-4 pt-8">
            <div className="rounded-lg border bg-card/50 p-4">
              <div className="text-2xl font-bold text-primary">+40%</div>
              <div className="text-sm text-muted-foreground">Redução de downtime</div>
            </div>
            <div className="rounded-lg border bg-card/50 p-4">
              <div className="text-2xl font-bold text-primary">97%</div>
              <div className="text-sm text-muted-foreground">Taxa de disponibilidade</div>
            </div>
            <div className="rounded-lg border bg-card/50 p-4">
              <div className="text-2xl font-bold text-primary">-25%</div>
              <div className="text-sm text-muted-foreground">Custos de manutenção</div>
            </div>
            <div className="rounded-lg border bg-card/50 p-4">
              <div className="text-2xl font-bold text-primary">+150</div>
              <div className="text-sm text-muted-foreground">Empresas ativas</div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-12 left-12 text-sm text-muted-foreground">
          ManuCMMS - Todos os direitos reservados
        </div>
      </div>
      
      {/* Painel direito - Formulário */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
