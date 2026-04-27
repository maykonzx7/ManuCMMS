import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Layout,
  Menu,
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
import { apiFetch } from '../lib/api';

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

  const preferredUnidadeId = backendMe?.usuario?.idUnidade ?? null;
  const currentUnidade =
    unidades.find((unidade) => unidade.id === preferredUnidadeId) ?? unidades[0] ?? null;

  const displayName =
    backendMe?.usuario?.nome ?? session.user.email?.split('@')[0] ?? 'Colaborador';
  const displayEmail = backendMe?.email ?? session.user.email ?? '-';

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

  function renderInicio() {
    return (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
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
        return (
          <UnavailableModule
            title="Modulo de usuarios indisponivel"
            description="O cadastro e a listagem de usuarios ainda nao possuem modulo HTTP pronto no backend."
          />
        );
      case 'permissoes':
        return (
          <UnavailableModule
            title="Modulo de permissoes indisponivel"
            description="A governanca fina por perfil e unidade ainda sera implementada em modulo proprio."
          />
        );
      default:
        return renderInicio();
    }
  }

  const activeModuleData = modules.find((module) => module.key === activeModule) ?? modules[0];

  return (
    <Layout className="app-layout">
      <Layout.Sider width={272} breakpoint="lg" collapsedWidth="0" theme="light" className="app-sider">
        <div className="sider-inner">
          <Space orientation="vertical" size={18} style={{ width: '100%' }}>
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
              <Space orientation="vertical" size={2}>
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

          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <Card size="small">
              <Space orientation="vertical" size={2}>
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
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            {authWarning ? <Alert type="warning" showIcon title={authWarning} /> : null}
            {workspaceError ? <Alert type="error" showIcon title={workspaceError} /> : null}

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
