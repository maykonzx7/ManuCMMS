import { useState } from 'react';
import { resolveApiBaseUrl } from '../lib/api';
import { Alert } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

type PlatformOwnerPageProps = {
  onGoToAccess: () => void;
};

export function PlatformOwnerPage({ onGoToAccess }: PlatformOwnerPageProps) {
  const platformAdminKey = import.meta.env.VITE_PLATFORM_ADMIN_KEY?.trim() ?? '';
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [slug, setSlug] = useState('');
  const [emailResponsavel, setEmailResponsavel] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [nomeUnidadeInicial, setNomeUnidadeInicial] = useState('Matriz');
  const [localizacaoUnidadeInicial, setLocalizacaoUnidadeInicial] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    empresa?: { id: string; nomeEmpresa: string; slug: string };
    convite?: { expiraEm: string; token?: string };
    entregaEmail?: { status: string; erro?: string };
    links?: { convite?: string };
  } | null>(null);

  async function criarEmpresaEConviteInicial() {
    if (!nomeEmpresa.trim() || !emailResponsavel.trim()) {
      setError('Informe nome da empresa e email do responsavel.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    setResult(null);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (platformAdminKey) {
      headers['x-platform-admin-key'] = platformAdminKey;
    }

    const response = await fetch(`${resolveApiBaseUrl()}/empresas`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        nomeEmpresa: nomeEmpresa.trim(),
        slug: slug.trim() || undefined,
        emailResponsavel: emailResponsavel.trim(),
        nomeResponsavel: nomeResponsavel.trim() || undefined,
        nomeUnidadeInicial: nomeUnidadeInicial.trim() || undefined,
        localizacaoUnidadeInicial: localizacaoUnidadeInicial.trim() || undefined,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const fallback = 'Falha ao criar empresa e convite inicial.';
      const text =
        payload && typeof payload === 'object' && typeof payload.message === 'string'
          ? payload.message
          : fallback;
      setError(text);
      setIsSubmitting(false);
      return;
    }

    setResult(payload);
    setMessage('Empresa criada com sucesso e convite inicial processado.');
    setIsSubmitting(false);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <p className="text-sm text-muted-foreground">Portal da plataforma · ativacao de empresa</p>
          <CardTitle>Criar empresa e convite de ativacao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Defina a nova base (empresa), o contato inicial e gere automaticamente o convite de ativacao.
          </p>
          {!platformAdminKey ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-700">
              Defina <strong>VITE_PLATFORM_ADMIN_KEY</strong> no frontend para habilitar criacao de empresas.
            </Alert>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Nome da empresa" value={nomeEmpresa} onChange={(event) => setNomeEmpresa(event.target.value)} />
            <Input placeholder="Slug (opcional)" value={slug} onChange={(event) => setSlug(event.target.value)} />
            <Input placeholder="Email que recebera o convite" type="email" value={emailResponsavel} onChange={(event) => setEmailResponsavel(event.target.value)} />
            <Input placeholder="Nome do responsavel" value={nomeResponsavel} onChange={(event) => setNomeResponsavel(event.target.value)} />
            <Input placeholder="Nome da unidade inicial" value={nomeUnidadeInicial} onChange={(event) => setNomeUnidadeInicial(event.target.value)} />
            <Input placeholder="Localizacao da unidade inicial" value={localizacaoUnidadeInicial} onChange={(event) => setLocalizacaoUnidadeInicial(event.target.value)} />
          </div>

          {message ? <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">{message}</Alert> : null}
          {error ? <Alert className="border-rose-200 bg-rose-50 text-rose-700">{error}</Alert> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={isSubmitting || !platformAdminKey || !nomeEmpresa.trim() || !emailResponsavel.trim()}
              onClick={() => void criarEmpresaEConviteInicial()}
            >
              {isSubmitting ? 'Criando...' : 'Criar empresa e enviar convite'}
            </Button>
            <Button variant="outline" onClick={onGoToAccess}>Ir para tela de acesso</Button>
          </div>

          {result ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <p><strong>Empresa:</strong> {result.empresa?.nomeEmpresa} ({result.empresa?.slug})</p>
              <p><strong>ID:</strong> {result.empresa?.id}</p>
              <p><strong>Entrega email:</strong> {result.entregaEmail?.status}{result.entregaEmail?.erro ? ` · ${result.entregaEmail.erro}` : ''}</p>
              <p><strong>Expira em:</strong> {result.convite?.expiraEm}</p>
              {result.links?.convite ? <p><strong>Link convite:</strong> {result.links.convite}</p> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
