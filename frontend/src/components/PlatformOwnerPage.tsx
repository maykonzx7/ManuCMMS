import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

type PlatformOwnerPageProps = {
  onGoToAccess: () => void;
};

export function PlatformOwnerPage({ onGoToAccess }: PlatformOwnerPageProps) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <p className="text-sm text-muted-foreground">Portal da plataforma</p>
          <CardTitle>Onboarding corporativo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Base preparada para criacao de empresas e convite inicial.</p>
          <Button onClick={onGoToAccess}>Ir para tela de acesso</Button>
        </CardContent>
      </Card>
    </main>
  );
}
