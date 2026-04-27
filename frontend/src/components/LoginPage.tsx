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
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { supabase, supabaseConfig } from '../lib/supabase';

type AuthMode = 'login' | 'signup' | 'reset';

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
    title: 'Acesso por perfil',
    body: 'Modulos e permissoes liberados de acordo com o cargo da conta autenticada.',
  },
  {
    title: 'Operacao por unidade',
    body: 'Cada sessao respeita o contexto operacional vinculado ao usuario no backend.',
  },
  {
    title: 'Supabase Auth',
    body: 'Login com email, Google, confirmacao de conta e recuperacao de senha.',
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
    eyebrow: 'Acesso institucional',
    title: 'Entrar no sistema',
    description:
      'Use suas credenciais corporativas ou o login Google para acessar o ambiente operacional.',
    buttonLabel: 'Entrar',
  },
  signup: {
    eyebrow: 'Primeiro acesso',
    title: 'Criar conta',
    description:
      'Crie sua conta com email corporativo. A ativacao sera concluida pela confirmacao enviada por email.',
    buttonLabel: 'Criar conta',
  },
  reset: {
    eyebrow: 'Recuperacao de acesso',
    title: 'Redefinir senha',
    description:
      'Informe seu email corporativo para receber o link de redefinicao de senha.',
    buttonLabel: 'Enviar link',
  },
};

function passwordMeetsPolicy(password: string) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);
}

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
        setMessage('Acesso validado. Preparando o ambiente operacional...');
        setError(null);
      }

      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        setMessage('Sessao de recuperacao identificada. Siga o fluxo de redefinicao do Supabase.');
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
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o login.');
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
        setError('Nao foi possivel autenticar. Revise email e senha e tente novamente.');
        setIsSubmitting(false);
        return;
      }

      setMessage('Acesso validado. Preparando o ambiente operacional...');
      setIsSubmitting(false);
      return;
    }

    if (mode === 'signup') {
      if (!passwordMeetsPolicy(form.password)) {
        setError('A senha deve ter pelo menos 8 caracteres, com letras e numeros.');
        setIsSubmitting(false);
        return;
      }

      if (form.password !== form.confirmPassword) {
        setError('A confirmacao de senha nao confere.');
        setIsSubmitting(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (signUpError) {
        setError('Nao foi possivel criar a conta agora. Revise os dados e tente novamente.');
        setIsSubmitting(false);
        return;
      }

      if (!data.session) {
        setMessage('Conta criada. Verifique seu email e confirme o acesso pelo link enviado.');
      } else {
        setMessage('Conta criada e autenticada. Preparando o ambiente operacional...');
      }

      setMode('login');
      setForm(INITIAL_FORM);
      setIsSubmitting(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl(),
    });

    if (resetError) {
      setError('Nao foi possivel enviar o link de redefinicao. Tente novamente em instantes.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Link de redefinicao enviado. Verifique sua caixa de entrada e spam.');
    setIsSubmitting(false);
  }

  async function handleGoogleSignIn() {
    if (!supabase) {
      setError('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o login.');
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
      setError('Nao foi possivel iniciar o login com Google.');
      setIsSubmitting(false);
      return;
    }

    setMessage('Redirecionando para autenticacao com Google...');
  }

  const currentMode = modeConfig[mode];
  const isConfigured = supabaseConfig.isConfigured;
  const formIsValid =
    form.email.trim().length > 0 &&
    (mode === 'reset' || form.password.length > 0) &&
    (mode !== 'signup' || form.confirmPassword.length > 0);

  return (
    <div className="login-page">
      <Row gutter={[24, 24]} className="login-page-row">
        <Col xs={24} lg={11}>
          <Card variant="borderless" className="login-brand-card">
            <Space orientation="vertical" size={24} style={{ width: '100%' }}>
              <Space align="center" size={12}>
                <div className="brand-icon-box">
                  <Building2 size={20} />
                </div>
                <div>
                  <Typography.Text className="brand-label">ManuCMMS</Typography.Text>
                  <Typography.Title level={3} style={{ margin: 0, color: '#f5f7f9' }}>
                    Ambiente corporativo
                  </Typography.Title>
                </div>
              </Space>

              <div>
                <Typography.Title level={1} className="brand-title">
                  Manutencao, operacao e rastreabilidade em um unico fluxo.
                </Typography.Title>
                <Typography.Paragraph className="brand-paragraph">
                  O acesso autentica o usuario no Supabase e respeita o contexto de unidade e
                  perfil retornado pelo backend.
                </Typography.Paragraph>
              </div>

              <Space wrap size={[8, 8]}>
                <Tag className="brand-tag" variant="filled">
                  <ShieldCheck size={14} /> Auth seguro
                </Tag>
                <Tag className="brand-tag" variant="filled">
                  <KeyRound size={14} /> Perfis por cargo
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
            <Space orientation="vertical" size={20} style={{ width: '100%' }}>
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
                <Tag color={isConfigured ? 'success' : 'warning'}>
                  {isConfigured ? 'Supabase configurado' : 'Configurar .env'}
                </Tag>
              </div>

              {isLoadingSession ? (
                <Alert
                  type="info"
                  showIcon
                  title="Validando sessao existente"
                  description="Aguarde enquanto verificamos se ja existe uma sessao ativa."
                />
              ) : null}

              {authWarning ? <Alert type="warning" showIcon title={authWarning} /> : null}

              {!isConfigured ? (
                <Alert
                  type="warning"
                  showIcon
                  title="Configuracao incompleta"
                  description="Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para liberar a autenticacao."
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
                  type={mode === 'signup' ? 'primary' : 'default'}
                  onClick={() => changeMode('signup')}
                >
                  Criar conta
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
                <Space orientation="vertical" size={14} style={{ width: '100%' }}>
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

                  {mode === 'signup' ? (
                    <>
                      <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                        A senha deve ter no minimo 8 caracteres, com letras e numeros.
                      </Typography.Paragraph>
                      <div>
                        <Typography.Text strong>Confirmacao de senha</Typography.Text>
                        <Input.Password
                          prefix={<KeyRound size={16} />}
                          size="large"
                          value={form.confirmPassword}
                          onChange={(event) => updateField('confirmPassword', event.target.value)}
                          placeholder="Repita a senha"
                        />
                      </div>
                    </>
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
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
