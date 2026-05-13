import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { resolveApiBaseUrl } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Alert } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';

function formatPerfilLabel(value?: string | null) {
  const perfil = value?.trim().toUpperCase() ?? '';
  if (perfil === 'ADMIN') return 'Administrador empresa';
  return perfil || 'N/D';
}

type InviteAccessPageProps = {
  session: Session | null;
  onGoToAccess: () => void;
};

export function InviteAccessPage({ session, onGoToAccess }: InviteAccessPageProps) {
  const tokenFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('token') ?? '';
  }, []);
  const inviteRedirectTo = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return `${window.location.origin}${window.location.pathname}${window.location.search}`;
  }, []);
  const nomeFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('nome') ?? '';
  }, []);
  const emailFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return (new URLSearchParams(window.location.search).get('email') ?? '')
      .trim()
      .toLowerCase();
  }, []);

  const [token, setToken] = useState(tokenFromUrl);
  const [nome, setNome] = useState(nomeFromUrl);
  const [emailAuth, setEmailAuth] = useState(emailFromUrl);
  const [passwordAuth, setPasswordAuth] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<{
    convite?: { id?: string; empresaId?: string; cargoCodigo?: string };
    usuario?: { id?: string; nome?: string; email?: string; perfil?: string };
  } | null>(null);

  useEffect(() => {
    setToken(tokenFromUrl);
    if (nomeFromUrl) {
      setNome(nomeFromUrl);
    }
    if (emailFromUrl) {
      setEmailAuth(emailFromUrl);
    }
  }, [nomeFromUrl, tokenFromUrl]);

  async function aceitarConviteComToken(accessToken: string) {
    if (!accessToken) {
      setError('Voce precisa autenticar antes de aceitar o convite.');
      return;
    }
    if (!token.trim()) {
      setError('Token de convite ausente.');
      return;
    }
    const emailSessao = (session?.user.email ?? '').trim().toLowerCase();
    if (emailFromUrl && emailSessao && emailSessao !== emailFromUrl) {
      setError(
        `Este convite foi emitido para ${emailFromUrl}. Troque de conta para continuar.`,
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);
    setAccepted(null);

    const response = await fetch(`${resolveApiBaseUrl()}/convites/aceitar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token.trim(),
        nome: nome.trim() || undefined,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const fallback = 'Falha ao aceitar convite.';
      const text =
        payload && typeof payload === 'object' && typeof payload.message === 'string'
          ? payload.message
          : fallback;
      setError(text);
      setIsSubmitting(false);
      return;
    }

    setAccepted(payload);
    setMessage('Convite aceito com sucesso. Seu acesso foi vinculado.');
    setIsSubmitting(false);
  }

  async function aceitarConvite() {
    if (!session?.access_token) {
      setError('Voce precisa autenticar antes de aceitar o convite.');
      return;
    }
    await aceitarConviteComToken(session.access_token);
  }

  async function entrarComSessao() {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: 'local' });
    onGoToAccess();
  }

  async function autenticarEContinuar() {
    if (!supabase) {
      setError('Autenticacao indisponivel.');
      return;
    }
    const email = emailAuth.trim().toLowerCase();
    if (!email || !passwordAuth) {
      setError('Informe email e senha para continuar.');
      return;
    }
    if (emailFromUrl && email !== emailFromUrl) {
      setError(`Use o mesmo email do convite: ${emailFromUrl}.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: passwordAuth,
    });
    if (!signInError && data.session?.access_token) {
      await aceitarConviteComToken(data.session.access_token);
      return;
    }

    const signInMessage = (signInError?.message ?? '').toLowerCase();
    const shouldTrySignup =
      signInMessage.includes('invalid login credentials') ||
      signInMessage.includes('email not confirmed') ||
      signInMessage.includes('invalid_credentials');

    if (!shouldTrySignup) {
      setError(signInError?.message || 'Nao foi possivel autenticar.');
      setIsSubmitting(false);
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: passwordAuth,
      options: {
        emailRedirectTo: inviteRedirectTo,
      },
    });
    if (signUpError) {
      setError(signUpError.message || 'Nao foi possivel criar conta.');
      setIsSubmitting(false);
      return;
    }

    const alreadyExists = (signUpData.user?.identities?.length ?? 0) === 0;
    if (alreadyExists) {
      setPendingConfirmationEmail(email);
      setError('Conta ja existe para este email. Confira a senha ou use reenvio/link de acesso.');
      setIsSubmitting(false);
      return;
    }

    if (signUpData.session) {
      await supabase.auth.signOut({ scope: 'local' });
    }
    setPendingConfirmationEmail(email);
    setMessage('Conta criada. Enviamos o email de confirmacao. Valide seu email e depois continue por aqui.');
    setIsSubmitting(false);
  }

  async function reenviarConfirmacao() {
    if (!supabase || !pendingConfirmationEmail) return;

    setIsSubmitting(true);
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: pendingConfirmationEmail,
      options: {
        emailRedirectTo: inviteRedirectTo,
      },
    });
    if (resendError) {
      setError(resendError.message || 'Nao foi possivel reenviar a confirmacao.');
      setIsSubmitting(false);
      return;
    }
    setMessage('Email de confirmacao reenviado. Verifique caixa de entrada e spam.');
    setIsSubmitting(false);
  }

  async function enviarLinkMagicoAcesso() {
    if (!supabase || !pendingConfirmationEmail) return;

    setIsSubmitting(true);
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: pendingConfirmationEmail,
      options: {
        emailRedirectTo: inviteRedirectTo,
        shouldCreateUser: false,
      },
    });
    if (otpError) {
      setError(otpError.message || 'Nao foi possivel enviar link de acesso.');
      setIsSubmitting(false);
      return;
    }
    setMessage('Link de acesso enviado por email. Abra o link para entrar e concluir o convite.');
    setIsSubmitting(false);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <p className="text-sm text-muted-foreground">Convite de acesso colaborador</p>
          <CardTitle>Aceitar convite e ativar acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Crie sua conta ou entre com o email do convite para ativar seu acesso.
          </p>
          <p className="text-sm">
            {session ? `Sessao ativa: ${session.user.email ?? 'sem email'}` : 'Sem sessao autenticada no momento.'}
          </p>
          {emailFromUrl ? (
            <p className="text-sm">
              Email do convite: <strong>{emailFromUrl}</strong>
            </p>
          ) : null}
          {!session ? (
            <Alert className="border-amber-200 bg-amber-50 text-amber-700">
              Você ainda não está autenticado. Crie conta ou entre abaixo usando o email do convite.
            </Alert>
          ) : null}

          {!session ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Email do convite"
                type="email"
                value={emailAuth}
                onChange={(event) => setEmailAuth(event.target.value)}
              />
              <Input
                placeholder="Senha"
                type="password"
                value={passwordAuth}
                onChange={(event) => setPasswordAuth(event.target.value)}
              />
              <Button
                className="md:col-span-2"
                variant="outline"
                disabled={isSubmitting || !emailAuth.trim() || !passwordAuth}
                onClick={() => void autenticarEContinuar()}
              >
                Continuar com e-mail
              </Button>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Token do convite" value={token} onChange={(event) => setToken(event.target.value)} />
            <Input placeholder="Nome exibicao (opcional)" value={nome} onChange={(event) => setNome(event.target.value)} />
          </div>

          {message ? <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">{message}</Alert> : null}
          {error ? <Alert className="border-rose-200 bg-rose-50 text-rose-700">{error}</Alert> : null}

          <div className="flex flex-wrap gap-2">
            <Button disabled={!session || !token.trim() || isSubmitting} onClick={() => void aceitarConvite()}>
              {isSubmitting ? 'Validando convite...' : 'Aceitar convite'}
            </Button>
            <Button variant="outline" onClick={onGoToAccess}>Ir para tela de acesso</Button>
            <Button variant="outline" onClick={() => void entrarComSessao()}>Trocar conta</Button>
            {pendingConfirmationEmail ? (
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => void reenviarConfirmacao()}
              >
                Reenviar confirmacao
              </Button>
            ) : null}
            {pendingConfirmationEmail ? (
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => void enviarLinkMagicoAcesso()}
              >
                Enviar link de acesso
              </Button>
            ) : null}
          </div>

          {accepted ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <p><strong>Usuario:</strong> {accepted.usuario?.nome} ({accepted.usuario?.email})</p>
              <p><strong>Perfil:</strong> {formatPerfilLabel(accepted.usuario?.perfil)}</p>
              <p><strong>Empresa ID:</strong> {accepted.convite?.empresaId}</p>
              <p><strong>Cargo:</strong> {formatPerfilLabel(accepted.convite?.cargoCodigo)}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
