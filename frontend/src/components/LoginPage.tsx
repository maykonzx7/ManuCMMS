import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import { supabase, supabaseConfig } from '../lib/supabase';
import { Alert } from './ui/alert';
import { Button } from './ui/button';
import { Input } from './ui/input';

type LoginPageProps = {
  authWarning: string | null;
  companySlug: string | null;
  isLoadingSession: boolean;
};

const operationalSignals = [
  'Rastreabilidade ponta a ponta',
  'Visao por perfil e unidade',
  'Respostas orientadas por dados',
];

export function LoginPage({ authWarning, companySlug, isLoadingSession }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setMessage('Acesso validado. Redirecionando para seu ambiente.');
        setError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError('Autenticacao indisponivel.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError('Nao foi possivel entrar. Revise seus dados.');
      setIsSubmitting(false);
      return;
    }

    setMessage(remember ? 'Acesso validado. Redirecionando.' : 'Acesso validado para esta sessao.');
    setIsSubmitting(false);
  }

  async function handleGoogleLogin() {
    if (!supabase) {
      setError('Autenticacao indisponivel.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window === 'undefined' ? undefined : window.location.origin,
      },
    });

    if (oauthError) {
      setError('Nao foi possivel iniciar o login com Google.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Redirecionando para autenticacao Google...');
  }

  async function handleResetPassword() {
    if (!supabase) {
      setError('Autenticacao indisponivel.');
      return;
    }

    if (!email.trim()) {
      setError('Informe o email institucional para recuperar a senha.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window === 'undefined' ? undefined : window.location.origin,
    });

    if (resetError) {
      setError('Nao foi possivel enviar o link de recuperacao.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Link de recuperacao enviado. Verifique seu email.');
    setIsSubmitting(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a1319] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(36,127,153,0.34),transparent_38%),radial-gradient(circle_at_85%_15%,rgba(16,185,129,0.20),transparent_40%),radial-gradient(circle_at_50%_85%,rgba(59,130,246,0.20),transparent_48%)]" />
      <div className="pointer-events-none absolute -left-36 top-20 h-72 w-72 rounded-full border border-cyan-300/20" />
      <div className="pointer-events-none absolute right-[-7rem] top-[20%] h-96 w-96 rounded-full border border-emerald-300/15" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center p-4 md:p-8">
        <div className="grid w-full items-stretch gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/5 p-7 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-300/15 blur-2xl" />
            <div className="absolute bottom-0 right-0 h-24 w-48 bg-gradient-to-l from-cyan-300/20 to-transparent" />

            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-200/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              ManuCMMS Control Layer
            </div>

            <h1 className="max-w-3xl font-display text-3xl font-semibold leading-tight text-white md:text-6xl">
              Operacao industrial em um cockpit digital de alta confianca.
            </h1>

            <p className="mt-5 max-w-2xl text-base text-slate-200/85 md:text-lg">
              Conecte manutencao, ativos e conformidade em uma interface desenhada para decisoes rapidas no chao de fabrica.
            </p>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {operationalSignals.map((signal) => (
                <div
                  key={signal}
                  className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-slate-100"
                >
                  <Waves className="mb-3 h-4 w-4 text-cyan-200" />
                  {signal}
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4 text-sm text-slate-300">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Acesso governado por RBAC
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Fluxo alinhado ao RF-02
              </span>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200/20 bg-[#f8fbfc] p-6 text-slate-900 shadow-[0_30px_80px_rgba(2,8,23,0.28)] md:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Secure Access</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900 md:text-3xl">Entrar na operacao</h2>
                <p className="mt-2 text-sm text-slate-600">Perfil, contexto e permissoes aplicados no login.</p>
                {companySlug ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                    Portal da empresa: {companySlug}
                  </p>
                ) : null}
              </div>
              <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                v2.0
              </span>
            </div>

            <div className="mb-4 space-y-2">
              {isLoadingSession ? <Alert>Verificando sessao existente...</Alert> : null}
              {authWarning ? <Alert>{authWarning}</Alert> : null}
              {!supabaseConfig.isConfigured ? <Alert>Supabase nao configurado no frontend.</Alert> : null}
              {message ? <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">{message}</Alert> : null}
              {error ? <Alert className="border-rose-200 bg-rose-50 text-rose-700">{error}</Alert> : null}
            </div>

            <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                <span>Email institucional</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    className="h-11 rounded-xl border-slate-300 bg-white pl-9"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                  />
                </div>
              </label>

              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                <span>Senha</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    className="h-11 rounded-xl border-slate-300 bg-white pl-9 pr-10"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-2 rounded-md p-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  Lembrar acesso
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-slate-700 hover:text-slate-950"
                  disabled={isSubmitting}
                  onClick={() => void handleResetPassword()}
                >
                  Esqueci minha senha
                </button>
              </div>

              <Button
                className="mt-2 h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                size="lg"
                disabled={!email || !password || isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Entrando...' : 'Entrar no sistema'}
                <ArrowUpRight className="h-4 w-4" />
              </Button>

              <Button
                className="h-11 w-full rounded-xl border-slate-300"
                size="lg"
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => void handleGoogleLogin()}
              >
                <Globe className="h-4 w-4" />
                Entrar com Google
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
              O acesso e monitorado por politica de seguranca, perfil corporativo e escopo de unidade fabril.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
