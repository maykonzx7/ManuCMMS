import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import { Building2, Factory, Link2, Shield } from 'lucide-react';
import { resolveApiBaseUrl } from '../lib/api';
import { getInvitePortalPath } from '../lib/portal-paths';

type PlatformOwnerPageProps = {
  onGoToAccess: () => void;
};

type CreatedCompanyResponse = {
  empresa: {
    id: string;
    nomeEmpresa: string;
    slug: string;
  };
  unidadeInicial: {
    id: string;
    nome: string;
    localizacao: string;
  };
  responsavelInicial: {
    nome: string;
    email: string;
  };
  convite: {
    id: string;
    expiraEm: string;
    cargoCodigo: string;
    token?: string;
  };
  entregaEmail?: {
    status: 'ENVIADO' | 'NAO_CONFIGURADO' | 'FALHOU';
    erro?: string;
  };
  links?: {
    convite?: string;
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

const INITIAL_FORM = {
  nomeEmpresa: '',
  slug: '',
  emailResponsavel: '',
  nomeResponsavel: '',
  nomeUnidadeInicial: 'Matriz',
  localizacaoUnidadeInicial: '',
};

export function PlatformOwnerPage({ onGoToAccess }: PlatformOwnerPageProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedCompanyResponse | null>(null);

  const inviteLink = useMemo(() => {
    if (created?.links?.convite) {
      return created.links.convite;
    }

    if (!created?.convite.token || typeof window === 'undefined') {
      return null;
    }

    const url = new URL(getInvitePortalPath(), window.location.origin);
    url.searchParams.set('token', created.convite.token);
    url.searchParams.set('email', created.responsavelInicial.email);
    url.searchParams.set('empresa', created.empresa.slug);
    return url.toString();
  }, [created]);

  function updateField(field: keyof typeof INITIAL_FORM, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${resolveApiBaseUrl()}/empresas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nomeEmpresa: form.nomeEmpresa,
          slug: form.slug || undefined,
          emailResponsavel: form.emailResponsavel,
          nomeResponsavel: form.nomeResponsavel || undefined,
          nomeUnidadeInicial: form.nomeUnidadeInicial || undefined,
          localizacaoUnidadeInicial: form.localizacaoUnidadeInicial || undefined,
        }),
      });

      const body = (await response.json()) as CreatedCompanyResponse | ApiErrorBody;

      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(body as ApiErrorBody, 'Nao foi possivel criar a empresa.'),
        );
      }

      setCreated(body as CreatedCompanyResponse);
      setMessage('Empresa criada com sucesso e convite inicial emitido.');
      setForm(INITIAL_FORM);
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Falha ao criar empresa no onboarding.',
      );
      setCreated(null);
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
                  <Shield size={20} />
                </div>
                <div>
                  <Typography.Text className="brand-label">Portal da plataforma</Typography.Text>
                  <Typography.Title level={3} style={{ margin: 0, color: '#f5f7f9' }}>
                    Painel do dono do sistema
                  </Typography.Title>
                </div>
              </Space>

              <div>
                <Typography.Title level={1} className="brand-title">
                  Controle o onboarding das empresas.
                </Typography.Title>
                <Typography.Paragraph className="brand-paragraph">
                  Este portal fica separado do acesso operacional dos usuarios. Aqui voce cria a
                  empresa, gera o convite inicial e entrega a jornada de primeiro acesso ao
                  responsavel do cliente.
                </Typography.Paragraph>
              </div>

              <Space wrap>
                <Tag className="brand-tag" icon={<Building2 size={14} />}>
                  Cadastro inicial de empresa
                </Tag>
                <Tag className="brand-tag" icon={<Factory size={14} />}>
                  Unidade inicial automatica
                </Tag>
                <Tag className="brand-tag" icon={<Link2 size={14} />}>
                  Convite temporario seguro
                </Tag>
              </Space>

              <Button type="default" onClick={onGoToAccess}>
                Ir para tela de acesso de usuarios
              </Button>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card variant="borderless" className="public-form-card">
            <Space direction="vertical" size={18} style={{ width: '100%' }}>
              <div className="login-header">
                <div>
                  <Typography.Text type="secondary">Onboarding corporativo</Typography.Text>
                  <Typography.Title level={2} style={{ margin: '4px 0 6px' }}>
                    Criar empresa e convite inicial
                  </Typography.Title>
                  <Typography.Paragraph style={{ margin: 0 }}>
                    O primeiro convite sai com papel administrativo, para que o responsavel da
                    empresa possa continuar a gestao interna depois do aceite.
                  </Typography.Paragraph>
                </div>
              </div>

              {message ? <Alert type="success" showIcon title={message} /> : null}
              {error ? <Alert type="error" showIcon title={error} /> : null}

              <form className="antd-form-stack" onSubmit={(event) => void handleSubmit(event)}>
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  <div>
                    <Typography.Text strong>Nome da empresa</Typography.Text>
                    <Input
                      value={form.nomeEmpresa}
                      onChange={(event) => updateField('nomeEmpresa', event.target.value)}
                      placeholder="Industria Exemplo"
                    />
                  </div>

                  <div>
                    <Typography.Text strong>Slug da empresa</Typography.Text>
                    <Input
                      value={form.slug}
                      onChange={(event) => updateField('slug', event.target.value)}
                      placeholder="industria-exemplo"
                    />
                  </div>

                  <div>
                    <Typography.Text strong>Email do responsavel</Typography.Text>
                    <Input
                      type="email"
                      value={form.emailResponsavel}
                      onChange={(event) =>
                        updateField('emailResponsavel', event.target.value)
                      }
                      placeholder="responsavel@empresa.com"
                    />
                  </div>

                  <div>
                    <Typography.Text strong>Nome do responsavel</Typography.Text>
                    <Input
                      value={form.nomeResponsavel}
                      onChange={(event) =>
                        updateField('nomeResponsavel', event.target.value)
                      }
                      placeholder="Nome da pessoa que vai aceitar o convite"
                    />
                  </div>

                  <div>
                    <Typography.Text strong>Nome da unidade inicial</Typography.Text>
                    <Input
                      value={form.nomeUnidadeInicial}
                      onChange={(event) =>
                        updateField('nomeUnidadeInicial', event.target.value)
                      }
                    />
                  </div>

                  <div>
                    <Typography.Text strong>Localizacao da unidade inicial</Typography.Text>
                    <Input
                      value={form.localizacaoUnidadeInicial}
                      onChange={(event) =>
                        updateField('localizacaoUnidadeInicial', event.target.value)
                      }
                      placeholder="Recife - PE"
                    />
                  </div>

                  <Button type="primary" htmlType="submit" loading={isSubmitting} size="large">
                    Criar empresa
                  </Button>
                </Space>
              </form>

              {created ? (
                <>
                  <Divider />
                  <Card size="small">
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        Convite inicial pronto
                      </Typography.Title>
                      <Typography.Text strong>{created.empresa.nomeEmpresa}</Typography.Text>
                      <Typography.Text type="secondary">
                        Responsavel inicial: {created.responsavelInicial.email}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        Cargo do convite: {created.convite.cargoCodigo}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        Entrega do email: {created.entregaEmail?.status ?? 'NAO_CONFIGURADO'}
                      </Typography.Text>
                      {created.entregaEmail?.erro ? (
                        <Alert type="warning" showIcon title={created.entregaEmail.erro} />
                      ) : null}
                      {inviteLink ? (
                        <>
                          <Typography.Text strong>Link publico do convite</Typography.Text>
                          <Input.TextArea value={inviteLink} readOnly autoSize={{ minRows: 3 }} />
                        </>
                      ) : null}
                    </Space>
                  </Card>
                </>
              ) : null}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
