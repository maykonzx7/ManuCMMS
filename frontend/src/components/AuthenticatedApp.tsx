import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Layout,
  Menu,
  Select,
  Result,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { MenuProps, TableColumnsType } from 'antd';
import {
  Blocks,
  ClipboardList,
  Factory,
  Gauge,
  KeySquare,
  LayoutDashboard,
  LogOut,
  SearchCheck,
  Shield,
  Users,
} from 'lucide-react';
import type { BackendMe } from '../lib/auth';
import { apiFetch, resolveApiBaseUrl } from '../lib/api';
import { getInvitePortalPath } from '../lib/portal-paths';

type AuthenticatedAppProps = {
  authWarning: string | null;
  session: Session;
  backendMe: BackendMe | null;
  isLoadingUser: boolean;
  onSignOut: () => Promise<void>;
};

type Perfil = 'TECNICO' | 'SUPERVISOR' | 'GESTOR' | 'AUDITOR' | 'ADMIN';

type ModuleKey =
  | 'inicio'
  | 'ordens'
  | 'ativos'
  | 'unidades'
  | 'dashboard'
  | 'auditoria'
  | 'usuarios'
  | 'permissoes';

type ModuleItem = {
  key: ModuleKey;
  label: string;
  description: string;
  icon: ReactNode;
};

type Unidade = {
  id: string;
  nome: string;
  localizacao: string;
  empresaId?: string | null;
};

type Ativo = {
  id: string;
  idUnidade: string;
  nome: string;
  status: string;
  limiteTemp: number;
};

type OrdemServico = {
  id: string;
  idAtivo: string;
  ativoNome: string;
  idTecnico: string | null;
  tipo: string;
  status: string;
  descricao: string;
  dataAbertura: string;
  dataFechamento: string | null;
};

type CreatedInviteResponse = {
  convite: {
    id: string;
    empresaId: string;
    emailDestino: string;
    cargoCodigo: string;
    idUnidadeDestino: string | null;
    expiraEm: string;
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

const moduleIcons: Record<ModuleKey, ReactNode> = {
  inicio: <LayoutDashboard size={16} />,
  ordens: <ClipboardList size={16} />,
  ativos: <Blocks size={16} />,
  unidades: <Factory size={16} />,
  dashboard: <Gauge size={16} />,
  auditoria: <SearchCheck size={16} />,
  usuarios: <Users size={16} />,
  permissoes: <KeySquare size={16} />,
};

function resolvePerfil(backendMe: BackendMe | null): Perfil {
  const perfil = backendMe?.usuario?.perfil?.toUpperCase();
  switch (perfil) {
    case 'SUPERVISOR':
    case 'GESTOR':
    case 'AUDITOR':
    case 'ADMIN':
    case 'TECNICO':
      return perfil;
    default:
      return 'TECNICO';
  }
}

function buildModules(perfil: Perfil): ModuleItem[] {
  const itemsByPerfil: Record<Perfil, Omit<ModuleItem, 'icon'>[]> = {
    TECNICO: [
      { key: 'inicio', label: 'Inicio', description: 'Resumo da conta autenticada' },
      { key: 'ordens', label: 'Ordens de servico', description: 'Fila real da unidade atual' },
      { key: 'ativos', label: 'Ativos', description: 'Ativos retornados pela API' },
      { key: 'unidades', label: 'Unidade', description: 'Escopo operacional disponivel' },
    ],
    SUPERVISOR: [
      { key: 'inicio', label: 'Inicio', description: 'Resumo operacional da unidade' },
      { key: 'ordens', label: 'Ordens de servico', description: 'Fila e andamento das ordens' },
      { key: 'ativos', label: 'Ativos', description: 'Ativos vinculados a unidade' },
      { key: 'unidades', label: 'Unidade', description: 'Contexto da planta atual' },
    ],
    GESTOR: [
      { key: 'inicio', label: 'Inicio', description: 'Visao geral da operacao' },
      { key: 'dashboard', label: 'Dashboard', description: 'Indicadores executivos' },
      { key: 'ordens', label: 'Ordens de servico', description: 'Operacao consolidada' },
      { key: 'ativos', label: 'Ativos', description: 'Base de ativos da unidade' },
      { key: 'usuarios', label: 'Usuarios', description: 'Acessos e perfis' },
    ],
    AUDITOR: [
      { key: 'inicio', label: 'Inicio', description: 'Escopo autenticado' },
      { key: 'auditoria', label: 'Auditoria', description: 'Trilhas e evidencias' },
      { key: 'ordens', label: 'Ordens de servico', description: 'Consulta de registros' },
      { key: 'ativos', label: 'Ativos', description: 'Consulta de ativos da unidade' },
    ],
    ADMIN: [
      { key: 'inicio', label: 'Inicio', description: 'Visao administrativa' },
      { key: 'usuarios', label: 'Usuarios', description: 'Cadastro e manutencao' },
      { key: 'permissoes', label: 'Permissoes', description: 'Perfis e governanca' },
      { key: 'ordens', label: 'Ordens de servico', description: 'Operacao da unidade' },
      { key: 'ativos', label: 'Ativos', description: 'Ativos cadastrados' },
      { key: 'unidades', label: 'Unidades', description: 'Estrutura organizacional' },
    ],
  };

  return itemsByPerfil[perfil].map((item) => ({
    ...item,
    icon: moduleIcons[item.key],
  }));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Em aberto';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function renderStatusTag(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === 'ABERTA') {
    return <Tag color="gold">{status}</Tag>;
  }

  if (normalized === 'EM_EXECUCAO' || normalized === 'MANUTENCAO') {
    return <Tag color="processing">{status}</Tag>;
  }

  if (normalized === 'CONCLUIDA' || normalized === 'ATIVO') {
    return <Tag color="success">{status}</Tag>;
  }

  return <Tag>{status}</Tag>;
}

function extractApiErrorMessage(body: ApiErrorBody, fallback: string) {
  if (typeof body.message === 'string') {
    return body.message;
  }

  if (Array.isArray(body.message)) {
    return body.message.join(' ');
  }

  return body.error || fallback;
}

function UnavailableModule({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <Result
        status="info"
        title={title}
        subTitle={description}
        icon={<Shield size={28} />}
      />
    </Card>
  );
}

export function AuthenticatedApp({
  authWarning,
  session,
  backendMe,
  isLoadingUser,
  onSignOut,
}: AuthenticatedAppProps) {
  const perfil = resolvePerfil(backendMe);
  const modules = useMemo(() => buildModules(perfil), [perfil]);
  const [activeModule, setActiveModule] = useState<ModuleKey>(modules[0]?.key ?? 'inicio');

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteCargo, setInviteCargo] = useState('TECNICO');
  const [inviteUnidadeId, setInviteUnidadeId] = useState<string | undefined>();
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<CreatedInviteResponse | null>(null);

  const preferredUnidadeId = backendMe?.usuario?.idUnidade ?? null;
  const currentUnidade =
    unidades.find((unidade) => unidade.id === preferredUnidadeId) ?? unidades[0] ?? null;

  const displayName =
    backendMe?.usuario?.nome ?? session.user.email?.split('@')[0] ?? 'Colaborador';
  const displayEmail = backendMe?.email ?? session.user.email ?? '-';
  const empresa = backendMe?.usuario?.empresa ?? null;
  const permissoes = backendMe?.usuario?.permissoes ?? [];
  const canInviteUsers = permissoes.includes('usuario.convidar');
  const canManageCompany = permissoes.includes('empresa.gerenciar');
  const cargoOptions = ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN'];
  const inviteLink =
    createdInvite?.links?.convite
      ? createdInvite.links.convite
      : createdInvite?.convite.token && empresa && typeof window !== 'undefined'
      ? (() => {
          const url = new URL('/convite', window.location.origin);
          url.pathname = getInvitePortalPath();
          url.searchParams.set('token', createdInvite.convite.token);
          url.searchParams.set('email', createdInvite.convite.emailDestino);
          url.searchParams.set('empresa', empresa.slug);
          return url.toString();
        })()
      : null;

  useEffect(() => {
    setActiveModule(modules[0]?.key ?? 'inicio');
  }, [modules]);

  useEffect(() => {
    if (!session.access_token || isLoadingUser || !backendMe) {
      setUnidades([]);
      setAtivos([]);
      setOrdens([]);
      return;
    }

    const controller = new AbortController();

    async function loadWorkspace() {
      setIsLoadingWorkspace(true);
      setWorkspaceError(null);

      try {
        const unidadesResponse = await apiFetch('/unidades', session.access_token, controller.signal);

        if (!unidadesResponse.ok) {
          throw new Error('Nao foi possivel carregar as unidades.');
        }

        const unidadesBody = (await unidadesResponse.json()) as Unidade[];
        setUnidades(unidadesBody);

        const selectedUnidade =
          unidadesBody.find((unidade) => unidade.id === preferredUnidadeId) ?? unidadesBody[0];

        if (!selectedUnidade) {
          setAtivos([]);
          setOrdens([]);
          return;
        }

        const [ativosResponse, ordensResponse] = await Promise.all([
          apiFetch(`/unidades/${selectedUnidade.id}/ativos`, session.access_token, controller.signal),
          apiFetch(
            `/unidades/${selectedUnidade.id}/ordens-servico`,
            session.access_token,
            controller.signal,
          ),
        ]);

        if (!ativosResponse.ok || !ordensResponse.ok) {
          throw new Error('Nao foi possivel carregar ativos e ordens da unidade atual.');
        }

        setAtivos((await ativosResponse.json()) as Ativo[]);
        setOrdens((await ordensResponse.json()) as OrdemServico[]);
      } catch (workspaceFetchError: unknown) {
        if ((workspaceFetchError as Error).name !== 'AbortError') {
          setWorkspaceError(
            workspaceFetchError instanceof Error
              ? workspaceFetchError.message
              : 'Falha ao carregar o workspace autenticado.',
          );
          setAtivos([]);
          setOrdens([]);
        }
      } finally {
        setIsLoadingWorkspace(false);
      }
    }

    void loadWorkspace();

    return () => controller.abort();
  }, [backendMe, isLoadingUser, preferredUnidadeId, session.access_token]);

  const ordensAbertas = ordens.filter((ordem) => ordem.status === 'ABERTA').length;
  const ordensEmExecucao = ordens.filter((ordem) => ordem.status === 'EM_EXECUCAO').length;
  const ativosEmManutencao = ativos.filter((ativo) => ativo.status === 'MANUTENCAO').length;

  const menuItems: MenuProps['items'] = modules.map((module) => ({
    key: module.key,
    icon: module.icon,
    label: module.label,
  }));

  const ordensColumns: TableColumnsType<OrdemServico> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: 'Ativo',
      dataIndex: 'ativoNome',
      key: 'ativoNome',
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      key: 'tipo',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderStatusTag(status),
    },
    {
      title: 'Abertura',
      dataIndex: 'dataAbertura',
      key: 'dataAbertura',
      render: (value: string) => formatDateTime(value),
    },
  ];

  const ativosColumns: TableColumnsType<Ativo> = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderStatusTag(status),
    },
    {
      title: 'Limite de temperatura',
      dataIndex: 'limiteTemp',
      key: 'limiteTemp',
      render: (value: number) => `${value} C`,
    },
  ];

  const unidadesColumns: TableColumnsType<Unidade> = [
    {
      title: 'Nome',
      dataIndex: 'nome',
      key: 'nome',
    },
    {
      title: 'Localizacao',
      dataIndex: 'localizacao',
      key: 'localizacao',
    },
  ];

  async function handleCreateInvite() {
    if (!session.access_token || !empresa) {
      return;
    }

    const emailDestino = inviteEmail.trim().toLowerCase();
    if (!emailDestino) {
      setInviteError('Informe o email do usuario que sera convidado.');
      return;
    }

    setIsSubmittingInvite(true);
    setInviteError(null);
    setInviteFeedback(null);
    setCreatedInvite(null);

    try {
      const response = await fetch(`${resolveApiBaseUrl()}/empresas/${empresa.id}/convites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          emailDestino,
          nomeDestino: inviteName.trim() || undefined,
          cargoCodigo: inviteCargo,
          idUnidadeDestino: inviteUnidadeId || null,
        }),
      });

      const body = (await response.json()) as CreatedInviteResponse | ApiErrorBody;
      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(body as ApiErrorBody, 'Nao foi possivel gerar o convite.'),
        );
      }

      const createdBody = body as CreatedInviteResponse;
      setCreatedInvite(createdBody);
      setInviteFeedback('Convite criado com sucesso. Agora voce pode enviar o link ao usuario.');
      setInviteEmail('');
      setInviteName('');
      setInviteCargo('TECNICO');
      setInviteUnidadeId(undefined);
    } catch (createInviteError: unknown) {
      setInviteError(
        createInviteError instanceof Error
          ? createInviteError.message
          : 'Falha ao criar convite para o usuario.',
      );
    } finally {
      setIsSubmittingInvite(false);
    }
  }

  function renderInicio() {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div className="stats-grid">
          <Card>
            <Statistic title="Unidades" value={unidades.length} />
          </Card>
          <Card>
            <Statistic title="Ativos" value={ativos.length} />
          </Card>
          <Card>
            <Statistic title="Ordens" value={ordens.length} />
          </Card>
          <Card>
            <Statistic title="Em manutencao" value={ativosEmManutencao} />
          </Card>
        </div>

        <div className="content-grid">
          <Card title="Contexto da conta">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Perfil">
                {backendMe?.usuario?.perfil ?? 'Nao identificado'}
              </Descriptions.Item>
              <Descriptions.Item label="Usuario local">
                {backendMe?.usuario?.id ?? 'Nao retornado'}
              </Descriptions.Item>
              <Descriptions.Item label="Unidade preferencial">
                {preferredUnidadeId ?? 'Nao informada'}
              </Descriptions.Item>
              <Descriptions.Item label="Auth UID">
                {backendMe?.userId ?? session.user.id}
              </Descriptions.Item>
              <Descriptions.Item label="Empresa">
                {empresa?.nomeEmpresa ?? 'Sem empresa vinculada'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Sinais operacionais">
            <div className="signal-list">
              {[
                currentUnidade
                  ? `Unidade atual: ${currentUnidade.nome}`
                  : 'Nenhuma unidade retornada para esta sessao.',
                ativosEmManutencao > 0
                  ? `${ativosEmManutencao} ativo(s) em manutencao no retorno atual da API.`
                  : 'Nenhum ativo em manutencao no retorno atual da API.',
                ordensEmExecucao > 0
                  ? `${ordensEmExecucao} ordem(ns) em execucao.`
                  : ordensAbertas > 0
                    ? `${ordensAbertas} ordem(ns) abertas aguardando andamento.`
                    : 'Sem ordens abertas ou em execucao na unidade atual.',
              ].map((item) => (
                <div key={item} className="signal-list-item">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Space>
    );
  }

  function renderOrdens() {
    return (
      <Card title="Ordens de servico" extra={currentUnidade?.nome ?? 'Sem unidade selecionada'}>
        <Table
          rowKey="id"
          columns={ordensColumns}
          dataSource={ordens}
          loading={isLoadingWorkspace}
          pagination={{ pageSize: 8 }}
          locale={{
            emptyText: 'A API nao retornou ordens para a unidade atual.',
          }}
          scroll={{ x: 820 }}
        />
      </Card>
    );
  }

  function renderAtivos() {
    return (
      <Card title="Ativos" extra={currentUnidade?.nome ?? 'Sem unidade selecionada'}>
        <Table
          rowKey="id"
          columns={ativosColumns}
          dataSource={ativos}
          loading={isLoadingWorkspace}
          pagination={{ pageSize: 8 }}
          locale={{
            emptyText: 'Nao ha ativos cadastrados para a unidade atual.',
          }}
          scroll={{ x: 720 }}
        />
      </Card>
    );
  }

  function renderUnidades() {
    return (
      <Card title="Unidades disponiveis">
        <Table
          rowKey="id"
          columns={unidadesColumns}
          dataSource={unidades}
          loading={isLoadingWorkspace}
          pagination={{ pageSize: 8 }}
          locale={{
            emptyText: 'A API nao retornou unidades para esta sessao.',
          }}
        />
      </Card>
    );
  }

  function renderUsuarios() {
    if (!canInviteUsers || !empresa) {
      return (
        <UnavailableModule
          title="Convites indisponiveis para este usuario"
          description="O perfil autenticado nao possui permissao para convidar usuarios da empresa."
        />
      );
    }

    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="Gestao de usuarios convidados">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Empresa">{empresa.nomeEmpresa}</Descriptions.Item>
            <Descriptions.Item label="Slug">{empresa.slug}</Descriptions.Item>
            <Descriptions.Item label="Permissao principal">
              usuario.convidar
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Novo convite de acesso">
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <div>
              <Typography.Text strong>Nome do convidado</Typography.Text>
              <Input
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
                placeholder="Nome da pessoa que vai receber o convite"
              />
            </div>

            <div>
              <Typography.Text strong>Email do convidado</Typography.Text>
              <Input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="colaborador@empresa.com"
              />
            </div>

            <div>
              <Typography.Text strong>Cargo de destino</Typography.Text>
              <Select
                value={inviteCargo}
                onChange={(value) => setInviteCargo(value)}
                options={cargoOptions.map((codigo) => ({
                  value: codigo,
                  label: codigo,
                }))}
              />
            </div>

            <div>
              <Typography.Text strong>Unidade de destino</Typography.Text>
              <Select
                allowClear
                value={inviteUnidadeId}
                onChange={(value) => setInviteUnidadeId(value)}
                placeholder="Opcional: convite corporativo sem unidade fixa"
                options={unidades.map((unidade) => ({
                  value: unidade.id,
                  label: `${unidade.nome} · ${unidade.localizacao}`,
                }))}
              />
            </div>

            <Button
              type="primary"
              onClick={() => void handleCreateInvite()}
              loading={isSubmittingInvite}
            >
              Gerar convite
            </Button>

            {inviteFeedback ? <Alert type="success" showIcon message={inviteFeedback} /> : null}
            {inviteError ? <Alert type="error" showIcon message={inviteError} /> : null}
          </Space>
        </Card>

        {createdInvite ? (
          <Card title="Convite pronto para envio">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Email">
                  {createdInvite.convite.emailDestino}
                </Descriptions.Item>
                <Descriptions.Item label="Cargo">
                  {createdInvite.convite.cargoCodigo}
                </Descriptions.Item>
                <Descriptions.Item label="Unidade">
                  {unidades.find((unidade) => unidade.id === createdInvite.convite.idUnidadeDestino)
                    ?.nome ?? 'Escopo corporativo'}
                </Descriptions.Item>
                <Descriptions.Item label="Expira em">
                  {formatDateTime(createdInvite.convite.expiraEm)}
                </Descriptions.Item>
                <Descriptions.Item label="Entrega do email">
                  {createdInvite.entregaEmail?.status ?? 'NAO_CONFIGURADO'}
                </Descriptions.Item>
              </Descriptions>

              {createdInvite.entregaEmail?.erro ? (
                <Alert type="warning" showIcon message={createdInvite.entregaEmail.erro} />
              ) : null}

              {inviteLink ? (
                <div>
                  <Typography.Text strong>Link de aceite</Typography.Text>
                  <Input.TextArea value={inviteLink} readOnly autoSize={{ minRows: 3 }} />
                </div>
              ) : null}

              <Typography.Paragraph style={{ margin: 0 }}>
                O usuario pode entrar pela tela do convite com email e senha ou Google. Depois do
                aceite, os proximos acessos passam a funcionar pela tela normal de login.
              </Typography.Paragraph>
            </Space>
          </Card>
        ) : null}
      </Space>
    );
  }

  function renderPermissoes() {
    if (!canManageCompany) {
      return (
        <UnavailableModule
          title="Governanca indisponivel para este usuario"
          description="A visualizacao administrativa da empresa so aparece para quem possui gestao do tenant."
        />
      );
    }

    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card title="Resumo da empresa">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Empresa">{empresa?.nomeEmpresa ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Slug">{empresa?.slug ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Tema global">
              Modo claro e escuro global do sistema
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Permissoes efetivas da sessao">
          <Space wrap size={[8, 8]}>
            {permissoes.length > 0 ? (
              permissoes.map((permissao) => <Tag key={permissao}>{permissao}</Tag>)
            ) : (
              <Typography.Text type="secondary">
                Nenhuma permissao retornada para esta sessao.
              </Typography.Text>
            )}
          </Space>
        </Card>

        <Card title="Cargos vinculados">
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {(backendMe?.usuario?.cargos ?? []).map((cargo) => (
              <Card key={cargo.id} size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Cargo">{cargo.nome}</Descriptions.Item>
                  <Descriptions.Item label="Codigo">{cargo.codigo}</Descriptions.Item>
                  <Descriptions.Item label="Nivel hierarquico">
                    {cargo.nivelHierarquico}
                  </Descriptions.Item>
                  <Descriptions.Item label="Escopo">
                    {unidades.find((unidade) => unidade.id === cargo.idUnidade)?.nome ??
                      'Corporativo'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Permissoes">
                    <Space wrap size={[6, 6]}>
                      {cargo.permissoes.map((permissao) => (
                        <Tag key={permissao}>{permissao}</Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ))}
          </Space>
        </Card>
      </Space>
    );
  }

  function renderModule() {
    switch (activeModule) {
      case 'inicio':
        return renderInicio();
      case 'ordens':
        return renderOrdens();
      case 'ativos':
        return renderAtivos();
      case 'unidades':
        return renderUnidades();
      case 'dashboard':
        return (
          <UnavailableModule
            title="Dashboard ainda nao implementado"
            description="Os indicadores executivos ainda nao possuem endpoint dedicado no backend atual."
          />
        );
      case 'auditoria':
        return (
          <UnavailableModule
            title="Modulo de auditoria indisponivel"
            description="A consulta de trilhas e logs ainda nao foi exposta como endpoint de leitura no backend."
          />
        );
      case 'usuarios':
        return renderUsuarios();
      case 'permissoes':
        return renderPermissoes();
      default:
        return renderInicio();
    }
  }

  const activeModuleData = modules.find((module) => module.key === activeModule) ?? modules[0];

  return (
    <Layout className="app-layout">
      <Layout.Sider width={272} breakpoint="lg" collapsedWidth="0" theme="light" className="app-sider">
        <div className="sider-inner">
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <div className="sider-brand">
              <Typography.Text className="sider-kicker">ManuCMMS</Typography.Text>
              <Typography.Title level={4} style={{ margin: 0 }}>
                Sistema corporativo
              </Typography.Title>
              <Typography.Paragraph style={{ margin: 0 }}>
                Navegacao por modulos conforme o cargo da conta autenticada.
              </Typography.Paragraph>
            </div>

            <Card size="small">
              <Space direction="vertical" size={2}>
                <Typography.Text strong>{displayName}</Typography.Text>
                <Typography.Text type="secondary">{displayEmail}</Typography.Text>
                <Tag color="blue" style={{ width: 'fit-content' }}>
                  {perfil}
                </Tag>
              </Space>
            </Card>

            <Menu
              mode="inline"
              selectedKeys={[activeModule]}
              items={menuItems}
              onClick={({ key }) => setActiveModule(key as ModuleKey)}
            />
          </Space>

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Space direction="vertical" size={2}>
                <Typography.Text type="secondary">Unidade atual</Typography.Text>
                <Typography.Text strong>{currentUnidade?.nome ?? 'Nao definida'}</Typography.Text>
                <Typography.Text type="secondary">
                  {isLoadingUser
                    ? 'Carregando contexto...'
                    : currentUnidade?.localizacao ?? 'Sem localizacao disponivel'}
                </Typography.Text>
              </Space>
            </Card>

            <Button icon={<LogOut size={16} />} onClick={() => void onSignOut()} block>
              Sair
            </Button>
          </Space>
        </div>
      </Layout.Sider>

      <Layout>
        <Layout.Header className="app-header">
          <div>
            <Typography.Text type="secondary">Modulo atual</Typography.Text>
            <Typography.Title level={2} style={{ margin: '4px 0 6px' }}>
              {activeModuleData?.label ?? 'Sistema'}
            </Typography.Title>
            <Typography.Paragraph style={{ margin: 0 }}>
              {activeModuleData?.description ?? 'Navegacao por modulos conforme o perfil da conta.'}
            </Typography.Paragraph>
          </div>
        </Layout.Header>

        <Layout.Content className="app-content">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {authWarning ? <Alert type="warning" showIcon message={authWarning} /> : null}
            {workspaceError ? <Alert type="error" showIcon message={workspaceError} /> : null}

            {isLoadingWorkspace && activeModule === 'inicio' ? (
              <Card>
                <div className="loading-block">
                  <Spin size="large" />
                  <Typography.Text type="secondary">
                    Carregando dados reais do workspace autenticado...
                  </Typography.Text>
                </div>
              </Card>
            ) : (
              renderModule()
            )}
          </Space>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
