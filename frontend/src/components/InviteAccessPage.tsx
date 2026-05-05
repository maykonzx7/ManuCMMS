import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import { CheckCircle2, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { resolveApiBaseUrl } from '../lib/api';
import { supabase, supabaseConfig } from '../lib/supabase';

type InviteAccessPageProps = {
  session: Session | null;
  onGoToAccess: () => void;
};

type AcceptInviteResponse = {
  convite: {
    id: string;
    status: string;
    empresaId: string;
    cargoCodigo: string;
    idUnidadeDestino: string | null;
  };
  usuario: {
    nome: string;
    email: string;
    empresa: {
      id: string;
      nomeEmpresa: string;
      slug: string;
    } | null;
  };
};

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
};

function extractApiErrorMessage(body: ApiErrorBody, fallback: string) {
  if (typeof body.message === 'string') {
    return body.message;
  }

  if (Array.isArray(body.message)) {
    return body.message.join(' ');
  }

  return body.error || fallback;
}

export function InviteAccessPage({ session, onGoToAccess }: InviteAccessPageProps) {
  const searchParams = useMemo(
    () => (typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search)),
    [],
  );
  const inviteToken = searchParams.get('token')?.trim() ?? '';
  const invitedEmail = searchParams.get('email')?.trim() ?? '';
  const empresaSlug = searchParams.get('empresa')?.trim() ?? '';

  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState<AcceptInviteResponse | null>(null);

  useEffect(() => {
    if (session?.user?.email && !email) {
      setEmail(session.user.email);
    }
  }, [email, session]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o login.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError('Nao foi possivel autenticar o usuario convidado. Revise email e senha.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Conta autenticada. Agora voce pode concluir o aceite do convite.');
    setIsSubmitting(false);
  }

  async function handleGoogleSignIn() {
    if (!supabase) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o login.');
      return;
    }

    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const redirectTo =
      typeof window !== 'undefined' ? window.location.href : undefined;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });

    if (oauthError) {
      setError('Nao foi possivel iniciar o login com Google para o convite.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Redirecionando para autenticacao Google...');
  }

  async function handleAcceptInvite() {
    if (!session?.access_token) {
      setError('Autentique-se primeiro para aceitar o convite.');
      return;
    }

    if (!inviteToken) {
      setError('Token de convite ausente na URL.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`${resolveApiBaseUrl()}/convites/aceitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          token: inviteToken,
          nome: displayName || undefined,
        }),
      });

      const body = (await response.json()) as AcceptInviteResponse | ApiErrorBody;

      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(body as ApiErrorBody, 'Nao foi possivel aceitar o convite.'),
        );
      }

      setAccepted(body as AcceptInviteResponse);
      setMessage('Convite aceito com sucesso. Seu acesso ja foi vinculado a empresa.');
    } catch (acceptError: unknown) {
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : 'Falha ao aceitar convite.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="public-shell">
      <Row gutter={[24, 24]} className="public-shell-row">
        <Col xs={24} xl={10}>
          <Card variant="borderless" className="public-brand-card">
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <Space align="center" size={12}>
                <div className="brand-icon-box">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <Typography.Text className="brand-label">Convite corporativo</Typography.Text>
                  <Typography.Title level={3} style={{ margin: 0, color: '#f5f7f9' }}>
                    Primeiro acesso por convite
                  </Typography.Title>
                </div>
              </Space>

              <div>
                <Typography.Title level={1} className="brand-title">
                  Entre e vincule sua conta ao ambiente da empresa.
                </Typography.Title>
                <Typography.Paragraph className="brand-paragraph">
                  O cadastro publico foi substituido por convite seguro. Voce pode entrar com
                  email e senha ou Google, e depois concluir o aceite para liberar o acesso nas
                  proximas sessoes.
                </Typography.Paragraph>
              </div>

              <Space wrap>
                {empresaSlug ? <Tag className="brand-tag">{empresaSlug}</Tag> : null}
                {invitedEmail ? <Tag className="brand-tag" icon={<Mail size={14} />}>{invitedEmail}</Tag> : null}
              </Space>

              <Button type="default" onClick={onGoToAccess}>
                Ir para tela de acesso padrao
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card variant="borderless" className="public-form-card">
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
              <div className="login-header">
                <div>
                  <Typography.Text type="secondary">Jornada do convidado</Typography.Text>
                  <Typography.Title level={2} style={{ margin: '4px 0 6px' }}>
                    Aceitar convite de acesso
                  </Typography.Title>
                  <Typography.Paragraph style={{ margin: 0 }}>
                    Primeiro autentique sua conta. Em seguida, confirme o aceite do convite para
                    registrar seu cargo e seu escopo dentro da empresa.
                  </Typography.Paragraph>
                </div>
              </div>

              {!supabaseConfig.isConfigured ? (
                <Alert
                  type="warning"
                  showIcon
                  title="Supabase nao configurado no frontend."
                />
              ) : null}

              {!inviteToken ? (
                <Alert type="error" showIcon title="Token de convite ausente na URL." />
              ) : null}

              {message ? <Alert type="success" showIcon title={message} /> : null}
              {error ? <Alert type="error" showIcon title={error} /> : null}

              {!session ? (
                <form className="antd-form-stack" onSubmit={(event) => void handleSignIn(event)}>
                  <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    <div>
                      <Typography.Text strong>Email do convite</Typography.Text>
                      <Input
                        prefix={<Mail size={16} />}
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="voce@empresa.com"
                      />
                    </div>

                    <div>
                      <Typography.Text strong>Senha</Typography.Text>
                      <Input.Password
                        prefix={<LockKeyhole size={16} />}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Sua senha de acesso"
                      />
                    </div>

                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<KeyRound size={16} />}
                      loading={isSubmitting}
                      size="large"
                    >
                      Entrar para aceitar convite
                    </Button>

                    <Button onClick={() => void handleGoogleSignIn()} loading={isSubmitting}>
                      Entrar com Google
                    </Button>
                  </Space>
                </form>
              ) : (
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  <Alert
                    type="info"
                    showIcon
                    title={`Conta autenticada como ${session.user.email ?? 'usuario sem email'}`}
                  />

                  <div>
                    <Typography.Text strong>Nome de exibicao</Typography.Text>
                    <Input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Como seu nome deve aparecer no sistema"
                    />
                  </div>

                  <Button
                    type="primary"
                    size="large"
                    icon={<CheckCircle2 size={16} />}
                    onClick={() => void handleAcceptInvite()}
                    loading={isSubmitting}
                    disabled={!inviteToken}
                  >
                    Aceitar convite agora
                  </Button>

                  {accepted ? (
                    <Card size="small">
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Typography.Text strong>Acesso liberado</Typography.Text>
                        <Typography.Text type="secondary">
                          Empresa: {accepted.usuario.empresa?.nomeEmpresa ?? 'Nao informada'}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          Cargo: {accepted.convite.cargoCodigo}
                        </Typography.Text>
                        <Button type="default" onClick={onGoToAccess}>
                          Ir para o sistema
                        </Button>
                      </Space>
                    </Card>
                  ) : null}
                </Space>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
