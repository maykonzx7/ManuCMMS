import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Input,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRight,
  Building2,
  Globe,
  LockKeyhole,
  Mail,
  Sparkles,
  Users,
} from 'lucide-react';
import { supabase, supabaseConfig } from '../lib/supabase';

type AuthMode = 'login' | 'reset';

type LoginPageProps = {
  authWarning: string | null;
  isLoadingSession: boolean;
};

const INITIAL_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  remember: true,
};

const capabilityCards = [
  {
    title: 'Acesso personalizado',
    body: 'Cada pessoa entra no ambiente com a visao e as liberacoes que fazem sentido para o seu papel.',
  },
  {
    title: 'Convite da empresa',
    body: 'Seu primeiro acesso acontece por convite, com todo o contexto ja preparado pela administracao da empresa.',
  },
  {
    title: 'Entrada simples',
    body: 'Depois do aceite, voce pode voltar quando quiser com email, senha ou Google.',
  },
];

const modeConfig: Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    buttonLabel: string;
  }
> = {
  login: {
    eyebrow: 'Acesso ao sistema',
    title: 'Entrar no ManuCMMS',
    description:
      'Use sua conta para acessar o ambiente da sua empresa com rapidez e seguranca.',
    buttonLabel: 'Entrar',
  },
  reset: {
    eyebrow: 'Recuperar acesso',
    title: 'Redefinir senha de acesso',
    description:
      'Informe seu email para receber um link e definir uma nova senha.',
    buttonLabel: 'Enviar link',
  },
};

function getRedirectUrl() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.location.origin;
}

export function LoginPage({ authWarning, isLoadingSession }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState(INITIAL_FORM);
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
        setMessage('Acesso validado. Preparando seu ambiente no ManuCMMS...');
        setError(null);
      }

      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setMessage('Sessao de recuperacao identificada. Siga o fluxo para redefinir sua senha.');
        setError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setMessage(null);
  }

  function updateField(field: keyof typeof INITIAL_FORM, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setError('O acesso esta temporariamente indisponivel. Tente novamente em instantes.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const email = form.email.trim();

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });

      if (signInError) {
        setError('Nao foi possivel entrar. Revise seus dados e tente novamente.');
        setIsSubmitting(false);
        return;
      }

      setMessage('Acesso validado. Preparando seu ambiente no ManuCMMS...');
      setIsSubmitting(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl(),
    });

    if (resetError) {
      setError('Nao foi possivel enviar o link agora. Tente novamente em instantes.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Link de redefinicao enviado. Verifique sua caixa de entrada e spam.');
    setIsSubmitting(false);
  }

  async function handleGoogleSignIn() {
    if (!supabase) {
      setError('O acesso com Google esta temporariamente indisponivel.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
      },
    });

    if (oauthError) {
      setError('Nao foi possivel iniciar o acesso com Google.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Redirecionando para o acesso com Google...');
  }

  const currentMode = modeConfig[mode];
  const isConfigured = supabaseConfig.isConfigured;
  const formIsValid = form.email.trim().length > 0 && (mode === 'reset' || form.password.length > 0);

  return (
    <div className="login-page">
      <Row gutter={[24, 24]} className="login-page-row">
        <Col xs={24} lg={11}>
          <Card variant="borderless" className="login-brand-card">
            <Space direction="vertical" size={24} style={{ width: '100%' }}>
              <Space align="center" size={12}>
                <div className="brand-icon-box">
                  <Building2 size={20} />
                </div>
                <div>
                  <Typography.Text className="brand-label">Sistema de manutencao</Typography.Text>
                  <Typography.Title level={3} style={{ margin: 0, color: '#f5f7f9' }}>
                    ManuCMMS
                  </Typography.Title>
                </div>
              </Space>

              <div>
                <Typography.Title level={1} className="brand-title">
                  O ponto de entrada da sua operacao industrial.
                </Typography.Title>
                <Typography.Paragraph className="brand-paragraph">
                  Acompanhe ativos, ordens de servico e a rotina da sua equipe em um ambiente
                  pensado para uso diario, com uma experiencia simples desde o primeiro acesso.
                </Typography.Paragraph>
              </div>

              <Space wrap size={[8, 8]}>
                <Tag className="brand-tag" variant="filled">
                  <Sparkles size={14} /> Experiencia clara
                </Tag>
                <Tag className="brand-tag" variant="filled">
                  <Users size={14} /> Acesso por equipe
                </Tag>
                <Tag className="brand-tag" variant="filled">
                  <ArrowRight size={14} /> Fluxo operacional
                </Tag>
              </Space>

              <div className="brand-capability-list">
                {capabilityCards.map((item) => (
                  <Card key={item.title} size="small" className="brand-capability-card">
                    <Typography.Text strong>{item.title}</Typography.Text>
                    <Typography.Paragraph>{item.body}</Typography.Paragraph>
                  </Card>
                ))}
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={13}>
          <Card variant="borderless" className="login-form-card">
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <div className="login-header">
                <div>
                  <Typography.Text type="secondary">{currentMode.eyebrow}</Typography.Text>
                  <Typography.Title level={2} style={{ marginTop: 6, marginBottom: 8 }}>
                    {currentMode.title}
                  </Typography.Title>
                  <Typography.Paragraph style={{ margin: 0 }}>
                    {currentMode.description}
                  </Typography.Paragraph>
                </div>
                <Tag color="blue">ManuCMMS</Tag>
              </div>

              {isLoadingSession ? (
                <Alert
                  type="info"
                  showIcon
                  title="Verificando acesso"
                  description="Aguarde enquanto identificamos se voce ja possui uma sessao ativa."
                />
              ) : null}

              {authWarning ? <Alert type="warning" showIcon title={authWarning} /> : null}

              {!isConfigured ? (
                <Alert
                  type="warning"
                  showIcon
                  title="Acesso temporariamente indisponivel"
                  description="No momento nao foi possivel disponibilizar a autenticacao. Tente novamente em instantes."
                />
              ) : null}

              {message ? <Alert type="success" showIcon title={message} /> : null}
              {error ? <Alert type="error" showIcon title={error} /> : null}

              <Space.Compact block>
                <Button
                  type={mode === 'login' ? 'primary' : 'default'}
                  onClick={() => changeMode('login')}
                >
                  Entrar
                </Button>
                <Button
                  type={mode === 'reset' ? 'primary' : 'default'}
                  onClick={() => changeMode('reset')}
                >
                  Recuperar senha
                </Button>
              </Space.Compact>

              <Button
                block
                icon={<Globe size={16} />}
                size="large"
                onClick={() => void handleGoogleSignIn()}
                loading={isSubmitting && mode === 'login'}
              >
                Continuar com Google
              </Button>

              <Divider style={{ margin: 0 }}>ou use seu email</Divider>

              <form onSubmit={(event) => void handleSubmit(event)} className="antd-form-stack">
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  <div>
                  <Typography.Text strong>Email corporativo</Typography.Text>
                    <Input
                      prefix={<Mail size={16} />}
                      size="large"
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      placeholder="nome@empresa.com"
                    />
                  </div>

                  {mode !== 'reset' ? (
                    <div>
                      <Typography.Text strong>Senha</Typography.Text>
                      <Input.Password
                        prefix={<LockKeyhole size={16} />}
                        size="large"
                        value={form.password}
                        onChange={(event) => updateField('password', event.target.value)}
                        placeholder="Digite sua senha"
                      />
                    </div>
                  ) : null}

                  {mode === 'login' ? (
                    <Checkbox
                      checked={form.remember}
                      onChange={(event) => updateField('remember', event.target.checked)}
                    >
                      Manter sessao ativa neste navegador
                    </Checkbox>
                  ) : null}

                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={isSubmitting}
                    disabled={!formIsValid || !isConfigured}
                  >
                    {currentMode.buttonLabel}
                  </Button>
                </Space>
              </form>

              <Alert
                type="info"
                showIcon
                title="Primeiro acesso por convite"
                description="Se esta for sua primeira entrada, use o link de convite enviado pela sua empresa. Depois do aceite, os proximos acessos acontecem por esta tela."
              />
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
