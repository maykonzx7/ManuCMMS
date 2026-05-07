import type { Session } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

type InviteAccessPageProps = {
  session: Session | null;
  onGoToAccess: () => void;
};

export function InviteAccessPage({ session, onGoToAccess }: InviteAccessPageProps) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <p className="text-sm text-muted-foreground">Convite de acesso</p>
          <CardTitle>Fluxo de primeiro acesso</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">Tela base para aceite de convite temporario com vinculacao por cargo/unidade.</p>
          <p className="mb-4 text-sm">{session ? `Sessao ativa: ${session.user.email ?? 'sem email'}` : 'Sem sessao autenticada no momento.'}</p>
          <Button onClick={onGoToAccess}>Ir para tela de acesso</Button>
        </CardContent>
      </Card>
    </main>
  );
}
