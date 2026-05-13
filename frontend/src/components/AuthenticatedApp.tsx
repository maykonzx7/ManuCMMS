import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Activity,
  Bell,
  Blocks,
  ClipboardList,
  Factory,
  FileCheck2,
  FileSpreadsheet,
  Gauge,
  Link2,
  LogOut,
  Radio,
  SearchCheck,
  Settings2,
  Shield,
  UserCog,
  Users,
  Warehouse,
} from 'lucide-react';
import type { BackendMe } from '../lib/auth';
import { apiFetch, resolveApiBaseUrl } from '../lib/api';
import { getAccessPortalPath, getPlatformPortalPath } from '../lib/portal-paths';
import { Alert } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Skeleton } from './ui/skeleton';

type AuthenticatedAppProps = {
  authWarning: string | null;
  session: Session;
  backendMe: BackendMe | null;
  isLoadingUser: boolean;
  onSignOut: () => Promise<void>;
};

type ScreenKey =
  | 'home'
  | 'os-lista'
  | 'os-detalhe'
  | 'ativos-lista'
  | 'ativos-cadastro'
  | 'dashboard'
  | 'auditoria'
  | 'usuarios'
  | 'permissoes'
  | 'unidades'
  | 'iot'
  | 'notificacoes'
  | 'relatorios'
  | 'integracoes'
  | 'configuracoes';

type Unidade = { id: string; nome: string; localizacao: string };
type Ativo = { id: string; nome: string; status: string; limiteTemp: number };
type OrdemServico = {
  id: string;
  idAtivo: string;
  ativoNome: string;
  status: string;
  tipo: string;
  descricao: string;
  dataAbertura: string;
  dataFechamento?: string | null;
};

type UsuarioUnidade = { id: string; nome: string; email: string; perfil: string; status?: string };
type CargoConvite = 'TECNICO' | 'SUPERVISOR' | 'GESTOR' | 'AUDITOR' | 'ADMIN';

type ScreenDef = {
  key: ScreenKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  profiles: string[];
  desc: string;
  module: ModuleKey;
};

type ModuleKey = 'visao' | 'operacao' | 'cadastros' | 'analises' | 'integracoes' | 'configuracao';

type ModuleDef = {
  key: ModuleKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
};

type SimulatedReading = {
  id: string;
  ativo: string;
  temperatura: number;
  momento: string;
  origem: 'SIMULADO';
};

type AuditLogItem = {
  idLog: string;
  entidadeAfetada: string;
  idRegistro: string;
  valorAnterior: Record<string, unknown>;
  valorNovo: Record<string, unknown>;
  dataHora: string;
};

type IntegracaoStatusItem = {
  ok: boolean;
  message: string;
};

type IntegracoesStatusResponse = {
  status: 'ok' | 'degraded';
  checkedAt: string;
  integrations: {
    rabbitmq: IntegracaoStatusItem;
    mongodb: IntegracaoStatusItem;
    smtp: IntegracaoStatusItem;
    iot: IntegracaoStatusItem;
  };
};

type GestaoPermissao = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  modulo: string;
};

type GestaoCargo = {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  nivelHierarquico: number;
  permissoes: string[];
};

type GestaoUsuario = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  status: string;
};

type GestaoPainelResponse = {
  empresa: { id: string; nomeEmpresa: string; slug: string };
  links: { acessoConta: string | null };
  usuarios: GestaoUsuario[];
  cargos: GestaoCargo[];
  permissoes: GestaoPermissao[];
};

const screens: ScreenDef[] = [
  { key: 'home', label: 'Home', icon: Activity, profiles: ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN'], desc: 'Visao por perfil e unidade', module: 'visao' },
  { key: 'os-lista', label: 'Ordens de Servico', icon: ClipboardList, profiles: ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN'], desc: 'Lista, filtros e criacao de OS', module: 'operacao' },
  { key: 'os-detalhe', label: 'Detalhe da OS', icon: FileCheck2, profiles: ['TECNICO', 'SUPERVISOR', 'GESTOR', 'ADMIN'], desc: 'Iniciar, cancelar e fechar OS', module: 'operacao' },
  { key: 'ativos-lista', label: 'Ativos', icon: Blocks, profiles: ['TECNICO', 'SUPERVISOR', 'GESTOR', 'AUDITOR', 'ADMIN'], desc: 'Inventario operacional da unidade', module: 'operacao' },
  { key: 'ativos-cadastro', label: 'Cadastro de Ativo', icon: Warehouse, profiles: ['SUPERVISOR', 'GESTOR', 'ADMIN'], desc: 'Criacao de ativos e regras termicas', module: 'cadastros' },
  { key: 'usuarios', label: 'Usuarios', icon: Users, profiles: ['SUPERVISOR', 'GESTOR', 'ADMIN'], desc: 'Usuarios por unidade fabril', module: 'cadastros' },
  { key: 'unidades', label: 'Unidades', icon: Factory, profiles: ['SUPERVISOR', 'GESTOR', 'ADMIN'], desc: 'Estrutura de unidades e contexto', module: 'cadastros' },
  { key: 'dashboard', label: 'Dashboard', icon: Gauge, profiles: ['GESTOR', 'ADMIN'], desc: 'KPIs executivos e disponibilidade', module: 'analises' },
  { key: 'auditoria', label: 'Auditoria', icon: SearchCheck, profiles: ['GESTOR', 'AUDITOR', 'ADMIN'], desc: 'Eventos e conformidade operacional', module: 'analises' },
  { key: 'notificacoes', label: 'Notificacoes', icon: Bell, profiles: ['SUPERVISOR', 'GESTOR', 'ADMIN'], desc: 'Alertas e eventos relevantes', module: 'analises' },
  { key: 'relatorios', label: 'Relatorios', icon: FileSpreadsheet, profiles: ['GESTOR', 'AUDITOR', 'ADMIN'], desc: 'Consolidado para exportacao', module: 'analises' },
  { key: 'integracoes', label: 'Integracoes', icon: Link2, profiles: ['GESTOR', 'ADMIN'], desc: 'Status da malha de integracao e IoT', module: 'integracoes' },
  { key: 'iot', label: 'IoT / Simulacao', icon: Radio, profiles: ['ADMIN'], desc: 'Simulador de telemetria e sinais', module: 'integracoes' },
  { key: 'permissoes', label: 'Permissoes', icon: UserCog, profiles: ['GESTOR', 'ADMIN'], desc: 'Cargos e permissoes do contexto atual', module: 'configuracao' },
  { key: 'configuracoes', label: 'Configuracoes', icon: Settings2, profiles: ['SUPERVISOR', 'GESTOR', 'ADMIN'], desc: 'Ajustes de acesso, contexto e operacao da base', module: 'configuracao' },
];

const moduleDefs: ModuleDef[] = [
  { key: 'visao', label: 'Visao Geral', icon: Activity, desc: 'Panorama do contexto atual' },
  { key: 'operacao', label: 'Operacao', icon: ClipboardList, desc: 'Execucao diaria e ordens' },
  { key: 'cadastros', label: 'Cadastros', icon: Warehouse, desc: 'Ativos, usuarios e unidades' },
  { key: 'analises', label: 'Analises', icon: Gauge, desc: 'Indicadores, alertas e relatorios' },
  { key: 'integracoes', label: 'Integracoes', icon: Link2, desc: 'Conectores e telemetria' },
  { key: 'configuracao', label: 'Configuracao', icon: Settings2, desc: 'Permissoes e ajustes da base' },
];

function resolvePerfil(backendMe: BackendMe | null) {
  return backendMe?.usuario?.perfil?.toUpperCase() ?? 'TECNICO';
}

function formatPerfilLabel(value?: string | null) {
  const perfil = value?.trim().toUpperCase() ?? '';
  if (perfil === 'ADMIN') return 'Administrador empresa';
  return perfil || 'N/D';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(parsed);
}

function statusBadge(status?: string) {
  const safeStatus = status && status.trim().length > 0 ? status : 'N/D';
  const normalized = safeStatus.toUpperCase();
  const tone =
    normalized === 'ABERTA'
      ? 'bg-amber-100 text-amber-700'
      : normalized === 'EM_EXECUCAO'
        ? 'bg-blue-100 text-blue-700'
        : normalized === 'CONCLUIDA' || normalized === 'ATIVO'
          ? 'bg-emerald-100 text-emerald-700'
          : normalized === 'CANCELADA'
            ? 'bg-rose-100 text-rose-700'
            : 'bg-slate-100 text-slate-700';

  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{safeStatus}</span>;
}

function extractMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;
  const candidate = payload as { message?: string | string[]; error?: string };
  if (typeof candidate.message === 'string') return candidate.message;
  if (Array.isArray(candidate.message)) return candidate.message.join(' ');
  if (typeof candidate.error === 'string') return candidate.error;
  return fallback;
}

function ScreenSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="space-y-2 pt-6"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></CardContent></Card>
        <Card><CardContent className="space-y-2 pt-6"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></CardContent></Card>
        <Card><CardContent className="space-y-2 pt-6"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></CardContent></Card>
        <Card><CardContent className="space-y-2 pt-6"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></CardContent></Card>
      </div>
    </div>
  );
}

export function AuthenticatedApp({ authWarning, session, backendMe, isLoadingUser, onSignOut }: AuthenticatedAppProps) {
  const perfil = resolvePerfil(backendMe);
  const visibleScreens = useMemo(() => {
    const base = screens.filter((screen) => screen.profiles.includes(perfil));
    if (perfil !== 'ADMIN') {
      return base;
    }

    const allowedForAdminConta = new Set<ScreenKey>([
      'home',
      'usuarios',
      'unidades',
      'permissoes',
      'configuracoes',
      'integracoes',
    ]);
    return base.filter((screen) => allowedForAdminConta.has(screen.key));
  }, [perfil]);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>((visibleScreens[0]?.key ?? 'home') as ScreenKey);
  const [expandedModules, setExpandedModules] = useState<Record<ModuleKey, boolean>>({
    visao: true,
    operacao: true,
    cadastros: true,
    analises: false,
    integracoes: false,
    configuracao: false,
  });

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<string>(backendMe?.usuario?.idUnidade ?? '');
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioUnidade[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [screenMessage, setScreenMessage] = useState<string | null>(null);

  const [novoAtivoNome, setNovoAtivoNome] = useState('');
  const [novoAtivoLimiteTemp, setNovoAtivoLimiteTemp] = useState('70');
  const [isCreatingAtivo, setIsCreatingAtivo] = useState(false);
  const [ativoSelecionadoId, setAtivoSelecionadoId] = useState('');
  const [ativoNomeEdicao, setAtivoNomeEdicao] = useState('');
  const [ativoLimiteEdicao, setAtivoLimiteEdicao] = useState('');
  const [ativoStatusEdicao, setAtivoStatusEdicao] = useState('OPERACIONAL');
  const [isUpdatingAtivo, setIsUpdatingAtivo] = useState(false);
  const [isDeletingAtivo, setIsDeletingAtivo] = useState(false);

  const [novaOsAtivoId, setNovaOsAtivoId] = useState('');
  const [novaOsTipo, setNovaOsTipo] = useState('PREVENTIVA');
  const [novaOsDescricao, setNovaOsDescricao] = useState('');
  const [isCreatingOs, setIsCreatingOs] = useState(false);

  const [ordemSelecionadaId, setOrdemSelecionadaId] = useState('');
  const [osDescricaoEdicao, setOsDescricaoEdicao] = useState('');
  const [osTecnicoEdicaoId, setOsTecnicoEdicaoId] = useState('');
  const [fotoAnexoFile, setFotoAnexoFile] = useState<File | null>(null);
  const [fotoProblemaFile, setFotoProblemaFile] = useState<File | null>(null);
  const [fotoSolucaoFile, setFotoSolucaoFile] = useState<File | null>(null);
  const [isUpdatingOs, setIsUpdatingOs] = useState(false);
  const [isEditingOs, setIsEditingOs] = useState(false);
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState('');
  const [unidadeDetalhe, setUnidadeDetalhe] = useState<Unidade | null>(null);
  const [conviteEmailDestino, setConviteEmailDestino] = useState('');
  const [conviteNomeDestino, setConviteNomeDestino] = useState('');
  const [conviteCargoCodigo, setConviteCargoCodigo] = useState<CargoConvite>('TECNICO');
  const [conviteUnidadeDestinoId, setConviteUnidadeDestinoId] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const [simulatedReadings, setSimulatedReadings] = useState<SimulatedReading[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const [integracoesStatus, setIntegracoesStatus] = useState<IntegracoesStatusResponse | null>(null);
  const [isLoadingIntegracoes, setIsLoadingIntegracoes] = useState(false);

  const [gestaoPainel, setGestaoPainel] = useState<GestaoPainelResponse | null>(null);
  const [isLoadingGestao, setIsLoadingGestao] = useState(false);
  const [isSavingGestao, setIsSavingGestao] = useState(false);
  const [editingCargoPermissoes, setEditingCargoPermissoes] = useState<Record<string, string[]>>({});
  const [novoCargoCodigo, setNovoCargoCodigo] = useState('');
  const [novoCargoNome, setNovoCargoNome] = useState('');
  const [novoCargoDescricao, setNovoCargoDescricao] = useState('');
  const [novoCargoNivel, setNovoCargoNivel] = useState('15');
  const [novoCargoPermissoes, setNovoCargoPermissoes] = useState<string[]>([]);

  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportFormato, setReportFormato] = useState<'excel' | 'pdf'>('excel');
  const [isExportingReport, setIsExportingReport] = useState(false);

  useEffect(() => {
    if (!selectedUnidadeId && backendMe?.usuario?.idUnidade) {
      setSelectedUnidadeId(backendMe.usuario.idUnidade);
    }
  }, [backendMe?.usuario?.idUnidade, selectedUnidadeId]);

  useEffect(() => {
    if (visibleScreens.some((screen) => screen.key === activeScreen)) {
      return;
    }
    if (visibleScreens[0]?.key) {
      setActiveScreen(visibleScreens[0].key);
    }
  }, [activeScreen, visibleScreens]);

  async function loadData() {
    if (!session.access_token) return;

    setIsLoadingData(true);
    setScreenError(null);

    try {
      const unidadeRes = await apiFetch('/unidades', session.access_token);
      if (unidadeRes.ok) {
        const unidadePayload = (await unidadeRes.json()) as Unidade[];
        const nextUnidades = unidadePayload ?? [];
        setUnidades(nextUnidades);

        if (!selectedUnidadeId && nextUnidades[0]?.id) {
          setSelectedUnidadeId(nextUnidades[0].id);
        }
      }

      const unidadeId = selectedUnidadeId || backendMe?.usuario?.idUnidade;
      if (!unidadeId) {
        setAtivos([]);
        setOrdens([]);
        setUsuarios([]);
        return;
      }

      const [ativosRes, ordensRes, usuariosRes] = await Promise.all([
        apiFetch(`/unidades/${unidadeId}/ativos`, session.access_token),
        apiFetch(`/unidades/${unidadeId}/ordens-servico`, session.access_token),
        apiFetch(`/unidades/${unidadeId}/usuarios`, session.access_token),
      ]);

      if (ativosRes.ok) {
        const payload = (await ativosRes.json()) as Ativo[];
        setAtivos(payload ?? []);
      } else {
        setAtivos([]);
      }

      if (ordensRes.ok) {
        const payload = (await ordensRes.json()) as OrdemServico[];
        const nextOrdens = payload ?? [];
        setOrdens(nextOrdens);
        if (!ordemSelecionadaId && nextOrdens[0]?.id) {
          setOrdemSelecionadaId(nextOrdens[0].id);
        }
      } else {
        setOrdens([]);
      }

      if (usuariosRes.ok) {
        const payload = (await usuariosRes.json()) as UsuarioUnidade[];
        setUsuarios(payload ?? []);
      } else {
        setUsuarios([]);
      }
    } catch {
      setScreenError('Falha ao carregar os dados operacionais.');
    } finally {
      setIsLoadingData(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnidadeId, session.access_token]);

  useEffect(() => {
    if (activeScreen === 'auditoria') {
      void loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen, selectedUnidadeId]);

  useEffect(() => {
    if (activeScreen === 'integracoes') {
      void loadIntegracoesStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen]);

  useEffect(() => {
    if (activeScreen === 'configuracoes') {
      void loadGestaoPainel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen]);

  const currentScreen = visibleScreens.find((screen) => screen.key === activeScreen) ?? visibleScreens[0];
  const canOpenUsuariosScreen = visibleScreens.some((screen) => screen.key === 'usuarios');
  const canOpenAtivosScreen = visibleScreens.some((screen) => screen.key === 'ativos-lista');
  const canOpenOsScreen = visibleScreens.some((screen) => screen.key === 'os-lista');
  const visibleModules = useMemo(() => {
    const grouped = new Map<ModuleKey, ScreenDef[]>();
    for (const screen of visibleScreens) {
      const existing = grouped.get(screen.module) ?? [];
      existing.push(screen);
      grouped.set(screen.module, existing);
    }
    return moduleDefs
      .filter((moduleDef) => grouped.has(moduleDef.key))
      .map((moduleDef) => ({ ...moduleDef, screens: grouped.get(moduleDef.key) ?? [] }));
  }, [visibleScreens]);
  const canInviteUsers = (backendMe?.usuario?.permissoes ?? []).includes('usuario.convidar');
  const isTecnico = perfil === 'TECNICO';
  const isAdmin = perfil === 'ADMIN';
  const accessCompanySlug = backendMe?.usuario?.empresa?.slug?.trim().toLowerCase() ?? '';
  const baseCompanyUrl =
    typeof window !== 'undefined' && accessCompanySlug
      ? `${window.location.origin}${getAccessPortalPath()}/${accessCompanySlug}`
      : null;

  const unidadeAtual = unidades.find((unidade) => unidade.id === selectedUnidadeId) ?? null;
  const ordemSelecionada = ordens.find((ordem) => ordem.id === ordemSelecionadaId) ?? null;

  const kpi = {
    ordensAbertas: ordens.filter((item) => item.status === 'ABERTA').length,
    ordensExecucao: ordens.filter((item) => item.status === 'EM_EXECUCAO').length,
    ordensConcluidas: ordens.filter((item) => item.status === 'CONCLUIDA').length,
    ativosAtivos: ativos.filter((item) => item.status === 'OPERACIONAL').length,
  };

  const notificacoes = [
    ...(kpi.ordensAbertas > 5 ? [{ id: 'n1', nivel: 'ATENCAO', texto: `Fila com ${kpi.ordensAbertas} OS abertas na unidade.` }] : []),
    ...(kpi.ordensExecucao > 0 ? [{ id: 'n2', nivel: 'INFO', texto: `${kpi.ordensExecucao} OS em execucao no momento.` }] : []),
    ...(simulatedReadings.filter((reading) => reading.temperatura >= 80).map((reading) => ({ id: reading.id, nivel: 'CRITICO', texto: `${reading.ativo} atingiu ${reading.temperatura.toFixed(1)} C na simulacao.` }))),
  ];

  async function createAtivo() {
    if (!selectedUnidadeId) {
      setScreenError('Selecione uma unidade para cadastrar ativo.');
      return;
    }

    setIsCreatingAtivo(true);
    setScreenError(null);
    setScreenMessage(null);

    const response = await fetch(`${resolveApiBaseUrl()}/unidades/${selectedUnidadeId}/ativos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nome: novoAtivoNome, limiteTemp: Number(novoAtivoLimiteTemp) }),
    });

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      setScreenError(extractMessage(body, 'Nao foi possivel cadastrar o ativo.'));
      setIsCreatingAtivo(false);
      return;
    }

    setScreenMessage('Ativo cadastrado com sucesso.');
    setNovoAtivoNome('');
    setNovoAtivoLimiteTemp('70');
    await loadData();
    setIsCreatingAtivo(false);
  }

  async function createOs() {
    if (!selectedUnidadeId) {
      setScreenError('Selecione uma unidade para criar OS.');
      return;
    }

    setIsCreatingOs(true);
    setScreenError(null);
    setScreenMessage(null);

    const response = await fetch(`${resolveApiBaseUrl()}/unidades/${selectedUnidadeId}/ordens-servico`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idAtivo: novaOsAtivoId, tipo: novaOsTipo, descricao: novaOsDescricao }),
    });

    if (!response.ok) {
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      setScreenError(extractMessage(body, 'Nao foi possivel criar a OS.'));
      setIsCreatingOs(false);
      return;
    }

    setScreenMessage('OS criada com sucesso.');
    setNovaOsDescricao('');
    await loadData();
    setIsCreatingOs(false);
  }

  async function updateOrdem(acao: 'iniciar' | 'cancelar' | 'fechar') {
    if (!selectedUnidadeId || !ordemSelecionadaId) {
      setScreenError('Selecione uma OS para executar a acao.');
      return;
    }

    setIsUpdatingOs(true);
    setScreenError(null);
    setScreenMessage(null);

    const endpoint = `/unidades/${selectedUnidadeId}/ordens-servico/${ordemSelecionadaId}/${acao}`;

    const body =
      acao === 'fechar'
        ? (() => {
            const form = new FormData();
            if (fotoAnexoFile) form.append('fotoAnexo', fotoAnexoFile);
            if (fotoProblemaFile) form.append('fotoProblema', fotoProblemaFile);
            if (fotoSolucaoFile) form.append('fotoSolucao', fotoSolucaoFile);
            return form;
          })()
        : undefined;

    const response = await fetch(`${resolveApiBaseUrl()}${endpoint}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body,
    });

    if (!response.ok) {
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      setScreenError(extractMessage(payload, `Nao foi possivel ${acao} a OS.`));
      setIsUpdatingOs(false);
      return;
    }

    setScreenMessage(`OS atualizada com sucesso (${acao}).`);
    await loadData();
    setIsUpdatingOs(false);
  }

  async function carregarDetalheAtivo(idAtivo: string) {
    if (!selectedUnidadeId) return;
    const res = await apiFetch(`/unidades/${selectedUnidadeId}/ativos/${idAtivo}`, session.access_token);
    if (!res.ok) return;
    const ativo = (await res.json()) as Ativo;
    setAtivoSelecionadoId(ativo.id);
    setAtivoNomeEdicao(ativo.nome);
    setAtivoLimiteEdicao(String(ativo.limiteTemp));
    setAtivoStatusEdicao(ativo.status);
  }

  async function atualizarAtivo() {
    if (!selectedUnidadeId || !ativoSelecionadoId) return;
    setIsUpdatingAtivo(true);
    setScreenError(null);
    const response = await fetch(`${resolveApiBaseUrl()}/unidades/${selectedUnidadeId}/ativos/${ativoSelecionadoId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome: ativoNomeEdicao || undefined,
        limiteTemp: ativoLimiteEdicao ? Number(ativoLimiteEdicao) : undefined,
        status: ativoStatusEdicao || undefined,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setScreenError(extractMessage(body, 'Falha ao atualizar ativo.'));
      setIsUpdatingAtivo(false);
      return;
    }
    setScreenMessage('Ativo atualizado com sucesso.');
    await loadData();
    setIsUpdatingAtivo(false);
  }

  async function excluirAtivo() {
    if (!selectedUnidadeId || !ativoSelecionadoId) return;
    setIsDeletingAtivo(true);
    setScreenError(null);
    const response = await fetch(`${resolveApiBaseUrl()}/unidades/${selectedUnidadeId}/ativos/${ativoSelecionadoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setScreenError(extractMessage(body, 'Falha ao excluir ativo.'));
      setIsDeletingAtivo(false);
      return;
    }
    setScreenMessage('Ativo removido com sucesso.');
    setAtivoSelecionadoId('');
    await loadData();
    setIsDeletingAtivo(false);
  }

  async function carregarDetalheOs(idOs: string) {
    if (!selectedUnidadeId) return;
    const res = await apiFetch(`/unidades/${selectedUnidadeId}/ordens-servico/${idOs}`, session.access_token);
    if (!res.ok) return;
    const os = (await res.json()) as OrdemServico;
    setOrdemSelecionadaId(os.id);
    setOsDescricaoEdicao(os.descricao);
    setOsTecnicoEdicaoId('');
  }

  async function editarOrdemServico() {
    if (!selectedUnidadeId || !ordemSelecionadaId) return;
    setIsEditingOs(true);
    setScreenError(null);
    const response = await fetch(
      `${resolveApiBaseUrl()}/unidades/${selectedUnidadeId}/ordens-servico/${ordemSelecionadaId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          descricao: osDescricaoEdicao || undefined,
          idTecnico: osTecnicoEdicaoId || undefined,
        }),
      },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setScreenError(extractMessage(body, 'Falha ao atualizar OS.'));
      setIsEditingOs(false);
      return;
    }
    setScreenMessage('OS atualizada com sucesso.');
    await loadData();
    setIsEditingOs(false);
  }

  async function carregarDetalheUsuario(idUsuario: string) {
    if (!selectedUnidadeId) return;
    setUsuarioSelecionadoId(idUsuario);
    const response = await apiFetch(`/unidades/${selectedUnidadeId}/usuarios/${idUsuario}`, session.access_token);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setScreenError(extractMessage(body, 'Falha ao carregar detalhe do usuario.'));
      return;
    }
    setScreenMessage('Detalhe do usuário carregado.');
  }

  async function carregarDetalheUnidade(unidadeIdParam?: string) {
    const unidadeId = unidadeIdParam || selectedUnidadeId;
    if (!unidadeId) return;
    const response = await apiFetch(`/unidades/${unidadeId}`, session.access_token);
    if (!response.ok) return;
    const unidade = (await response.json()) as Unidade;
    setUnidadeDetalhe(unidade);
  }

  useEffect(() => {
    if (activeScreen !== 'unidades' || !selectedUnidadeId) {
      return;
    }
    void carregarDetalheUnidade(selectedUnidadeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen, selectedUnidadeId, session.access_token]);

  async function enviarConviteUsuario() {
    const empresaId = backendMe?.usuario?.empresa?.id;
    if (!empresaId) {
      setScreenError('Empresa do usuario autenticado nao encontrada.');
      return;
    }
    if (!canInviteUsers) {
      setScreenError('Voce nao possui permissao para convidar usuarios.');
      return;
    }
    if (!conviteEmailDestino.trim()) {
      setScreenError('Informe o email de destino do convite.');
      return;
    }

    setIsSendingInvite(true);
    setScreenError(null);
    setScreenMessage(null);

    const response = await fetch(`${resolveApiBaseUrl()}/empresas/${empresaId}/convites`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailDestino: conviteEmailDestino.trim(),
        nomeDestino: conviteNomeDestino.trim() || undefined,
        cargoCodigo: conviteCargoCodigo,
        idUnidadeDestino: conviteUnidadeDestinoId || selectedUnidadeId || undefined,
      }),
    });

    const body = await response.json().catch(() => null) as
      | {
          entregaEmail?: { status?: string; erro?: string };
          links?: { convite?: string };
        }
      | null;

    if (!response.ok) {
      setScreenError(extractMessage(body, 'Falha ao enviar convite.'));
      setIsSendingInvite(false);
      return;
    }

    if (body?.entregaEmail?.status === 'FALHOU') {
      const linkConvite = body?.links?.convite;
      setScreenError(
        body.entregaEmail.erro
          ? `Convite criado, mas o email falhou: ${body.entregaEmail.erro}`
          : 'Convite criado, mas o email falhou.',
      );
      if (linkConvite) {
        setScreenMessage(`Use o link do convite para concluir o aceite: ${linkConvite}`);
      } else {
        setScreenMessage(null);
      }
      setIsSendingInvite(false);
      return;
    }

    const linkConvite = body?.links?.convite;
    setScreenMessage(
      linkConvite
        ? `Convite enviado com sucesso. Link atribuido: ${linkConvite}`
        : 'Convite enviado com sucesso.',
    );
    setConviteEmailDestino('');
    setConviteNomeDestino('');
    setConviteCargoCodigo('TECNICO');
    setConviteUnidadeDestinoId('');
    setIsSendingInvite(false);
  }

  function simulateReading() {
    const sourceAtivo = ativos[Math.floor(Math.random() * Math.max(ativos.length, 1))];
    const next: SimulatedReading = {
      id: crypto.randomUUID(),
      ativo: sourceAtivo?.nome ?? 'Ativo sem cadastro',
      temperatura: Number((55 + Math.random() * 40).toFixed(1)),
      momento: new Date().toISOString(),
      origem: 'SIMULADO',
    };

    setSimulatedReadings((current) => [next, ...current].slice(0, 12));
  }

  async function loadAuditLogs() {
    setIsLoadingAudit(true);
    setScreenError(null);
    try {
      const query = new URLSearchParams();
      if (selectedUnidadeId) query.set('unidadeId', selectedUnidadeId);
      if (auditFrom) query.set('from', auditFrom);
      if (auditTo) query.set('to', auditTo);
      query.set('limit', '80');

      const response = await apiFetch(`/auditoria?${query.toString()}`, session.access_token);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(extractMessage(body, 'Nao foi possivel carregar auditoria.'));
      }

      const payload = (await response.json()) as { logs: AuditLogItem[] };
      setAuditLogs(payload.logs ?? []);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Falha ao carregar auditoria.');
      setAuditLogs([]);
    } finally {
      setIsLoadingAudit(false);
    }
  }

  async function loadIntegracoesStatus() {
    setIsLoadingIntegracoes(true);
    setScreenError(null);

    try {
      const response = await apiFetch('/integracoes/status', session.access_token);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(extractMessage(body, 'Nao foi possivel carregar status das integracoes.'));
      }

      const payload = (await response.json()) as IntegracoesStatusResponse;
      setIntegracoesStatus(payload);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Falha ao carregar integracoes.');
      setIntegracoesStatus(null);
    } finally {
      setIsLoadingIntegracoes(false);
    }
  }

  async function exportReport() {
    if (!selectedUnidadeId) {
      setScreenError('Selecione uma unidade para exportar.');
      return;
    }

    setIsExportingReport(true);
    setScreenError(null);

    try {
      const query = new URLSearchParams({
        formato: reportFormato,
        unidadeId: selectedUnidadeId,
      });
      if (reportFrom) query.set('from', reportFrom);
      if (reportTo) query.set('to', reportTo);

      const response = await fetch(`${resolveApiBaseUrl()}/relatorios/export?${query.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(extractMessage(body, 'Falha ao exportar relatorio.'));
      }

      const blob = await response.blob();
      const fileName = `relatorio_${selectedUnidadeId}_${Date.now()}.${reportFormato === 'excel' ? 'csv' : 'pdf'}`;
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(href);
      setScreenMessage('Relatorio exportado com sucesso.');
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Falha ao exportar relatorio.');
    } finally {
      setIsExportingReport(false);
    }
  }

  function renderFotoUploadField(input: {
    title: string;
    helper: string;
    required?: boolean;
    file: File | null;
    onChange: (file: File | null) => void;
  }) {
    return (
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-sm font-semibold">
          {input.title}
          {input.required ? <span className="ml-1 text-rose-600">*</span> : null}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{input.helper}</p>
        <Input
          className="mt-3 h-11"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => input.onChange(event.target.files?.[0] ?? null)}
        />
        {input.file ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1 text-xs">
            <span className="truncate">{input.file.name}</span>
            <Button size="sm" variant="ghost" onClick={() => input.onChange(null)}>
              Remover
            </Button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Nenhuma foto selecionada.</p>
        )}
      </div>
    );
  }

  async function loadGestaoPainel() {
    const empresaId = backendMe?.usuario?.empresa?.id;
    if (!empresaId) return;

    setIsLoadingGestao(true);
    setScreenError(null);
    try {
      const response = await apiFetch(`/empresas/${empresaId}/gestao/painel`, session.access_token);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(extractMessage(body, 'Falha ao carregar painel de gestão.'));
      }
      const payload = (await response.json()) as GestaoPainelResponse;
      setGestaoPainel(payload);
      setEditingCargoPermissoes(
        Object.fromEntries((payload.cargos ?? []).map((cargo) => [cargo.id, cargo.permissoes])),
      );
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Falha ao carregar gestão.');
    } finally {
      setIsLoadingGestao(false);
    }
  }

  async function atualizarStatusUsuarioGestao(usuarioId: string, status: 'ATIVO' | 'INATIVO' | 'BLOQUEADO') {
    const empresaId = backendMe?.usuario?.empresa?.id;
    if (!empresaId) return;

    setIsSavingGestao(true);
    setScreenError(null);
    const response = await fetch(`${resolveApiBaseUrl()}/empresas/${empresaId}/gestao/usuarios/${usuarioId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setScreenError(extractMessage(body, 'Falha ao atualizar status do usuário.'));
      setIsSavingGestao(false);
      return;
    }
    setScreenMessage(`Status atualizado para ${status}.`);
    await loadGestaoPainel();
    setIsSavingGestao(false);
  }

  async function atualizarPerfilUsuarioGestao(usuarioId: string, perfilNovo: string) {
    const empresaId = backendMe?.usuario?.empresa?.id;
    if (!empresaId) return;

    setIsSavingGestao(true);
    setScreenError(null);
    const response = await fetch(`${resolveApiBaseUrl()}/empresas/${empresaId}/gestao/usuarios/${usuarioId}/perfil`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ perfil: perfilNovo }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setScreenError(extractMessage(body, 'Falha ao atualizar perfil do usuário.'));
      setIsSavingGestao(false);
      return;
    }
    setScreenMessage(`Perfil atualizado para ${perfilNovo}.`);
    await loadGestaoPainel();
    setIsSavingGestao(false);
  }

  async function gerarResetSenhaUsuario(usuarioId: string) {
    const empresaId = backendMe?.usuario?.empresa?.id;
    if (!empresaId) return;

    setIsSavingGestao(true);
    setScreenError(null);
    const response = await fetch(`${resolveApiBaseUrl()}/empresas/${empresaId}/gestao/usuarios/${usuarioId}/reset-senha`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const body = await response.json().catch(() => null) as { resetLink?: string } | null;
    if (!response.ok) {
      setScreenError(extractMessage(body, 'Falha ao gerar reset de senha.'));
      setIsSavingGestao(false);
      return;
    }
    setScreenMessage(body?.resetLink ? `Link de reset gerado: ${body.resetLink}` : 'Reset de senha solicitado com sucesso.');
    setIsSavingGestao(false);
  }

  function togglePermissaoCargo(cargoId: string, codigoPermissao: string) {
    setEditingCargoPermissoes((current) => {
      const currentList = current[cargoId] ?? [];
      const nextList = currentList.includes(codigoPermissao)
        ? currentList.filter((item) => item !== codigoPermissao)
        : [...currentList, codigoPermissao];
      return { ...current, [cargoId]: nextList.sort() };
    });
  }

  async function salvarPermissoesCargo(cargoId: string) {
    const empresaId = backendMe?.usuario?.empresa?.id;
    if (!empresaId) return;

    setIsSavingGestao(true);
    setScreenError(null);
    const response = await fetch(`${resolveApiBaseUrl()}/empresas/${empresaId}/gestao/cargos/${cargoId}/permissoes`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ permissoes: editingCargoPermissoes[cargoId] ?? [] }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setScreenError(extractMessage(body, 'Falha ao salvar permissões do cargo.'));
      setIsSavingGestao(false);
      return;
    }
    setScreenMessage('Permissões do cargo atualizadas.');
    await loadGestaoPainel();
    setIsSavingGestao(false);
  }

  function toggleNovaPermissaoCargo(codigoPermissao: string) {
    setNovoCargoPermissoes((current) =>
      current.includes(codigoPermissao)
        ? current.filter((item) => item !== codigoPermissao)
        : [...current, codigoPermissao].sort(),
    );
  }

  async function criarCargoPersonalizado() {
    const empresaId = backendMe?.usuario?.empresa?.id;
    if (!empresaId) return;
    if (!novoCargoCodigo.trim() || !novoCargoNome.trim()) {
      setScreenError('Informe código e nome do novo cargo.');
      return;
    }

    setIsSavingGestao(true);
    setScreenError(null);
    const response = await fetch(`${resolveApiBaseUrl()}/empresas/${empresaId}/gestao/cargos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        codigo: novoCargoCodigo.trim().toUpperCase(),
        nome: novoCargoNome.trim(),
        descricao: novoCargoDescricao.trim() || undefined,
        nivelHierarquico: Number(novoCargoNivel),
        permissoes: novoCargoPermissoes,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setScreenError(extractMessage(body, 'Falha ao criar cargo personalizado.'));
      setIsSavingGestao(false);
      return;
    }

    setScreenMessage('Cargo personalizado criado com sucesso.');
    setNovoCargoCodigo('');
    setNovoCargoNome('');
    setNovoCargoDescricao('');
    setNovoCargoNivel('15');
    setNovoCargoPermissoes([]);
    await loadGestaoPainel();
    setIsSavingGestao(false);
  }

  function renderSharedHeader(mode: 'unidade' | 'empresa' = 'unidade') {
    const resolvedMode = perfil === 'ADMIN' ? 'empresa' : mode;
    if (resolvedMode === 'empresa') {
      return (
        <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Empresa em contexto</p>
              <h2 className="font-display text-xl font-semibold">{backendMe?.usuario?.empresa?.nomeEmpresa ?? 'Empresa não definida'}</h2>
              <p className="text-sm text-muted-foreground">Slug: {backendMe?.usuario?.empresa?.slug ?? 'N/D'}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.href = getPlatformPortalPath();
                  }
                }}
              >
                Ir para gestão da plataforma
              </Button>
            </div>
          </div>

          {screenMessage ? <Alert className="mb-3 border-emerald-200 bg-emerald-50 text-emerald-700">{screenMessage}</Alert> : null}
          {screenError ? <Alert className="mb-3 border-rose-200 bg-rose-50 text-rose-700">{screenError}</Alert> : null}
        </>
      );
    }

    return (
      <>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Unidade em contexto</p>
            <h2 className="font-display text-xl font-semibold">{unidadeAtual?.nome ?? 'Selecione uma unidade'}</h2>
            <p className="text-sm text-muted-foreground">{unidadeAtual?.localizacao || 'Sem localizacao definida'}</p>
          </div>

          <div className="min-w-[220px]">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Trocar unidade</label>
            <select
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              value={selectedUnidadeId}
              onChange={(event) => setSelectedUnidadeId(event.target.value)}
            >
              <option value="">Selecione</option>
              {unidades.map((unidade) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {screenMessage ? <Alert className="mb-3 border-emerald-200 bg-emerald-50 text-emerald-700">{screenMessage}</Alert> : null}
        {screenError ? <Alert className="mb-3 border-rose-200 bg-rose-50 text-rose-700">{screenError}</Alert> : null}
      </>
    );
  }

  function renderScreen() {
    if (isLoadingUser) {
      return <ScreenSkeleton />;
    }

    if (isLoadingData) {
      return <ScreenSkeleton />;
    }

    switch (activeScreen) {
      case 'home':
        return (
          <div className="space-y-4">
            {renderSharedHeader(perfil === 'ADMIN' ? 'empresa' : 'unidade')}
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>Painel CRM da Conta</CardTitle>
                  <CardDescription>Gestão central da conta cliente, sem operação por unidade.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>Empresa:</strong> {backendMe?.usuario?.empresa?.nomeEmpresa ?? 'N/D'}</p>
                  <p><strong>Slug:</strong> {backendMe?.usuario?.empresa?.slug ?? 'N/D'}</p>
                  {baseCompanyUrl ? <p><strong>Link da base:</strong> {baseCompanyUrl}</p> : null}
                </CardContent>
              </Card>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card><CardHeader><CardDescription>Ordens abertas</CardDescription><CardTitle>{kpi.ordensAbertas}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Ordens em execucao</CardDescription><CardTitle>{kpi.ordensExecucao}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Ordens concluidas</CardDescription><CardTitle>{kpi.ordensConcluidas}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Ativos ativos</CardDescription><CardTitle>{kpi.ativosAtivos}</CardTitle></CardHeader></Card>
            </div>
          </div>
        );

      case 'ativos-lista':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <Card>
              <CardHeader>
                <CardTitle>Inventario de ativos</CardTitle>
                <CardDescription>Lista operacional por unidade com limite termico.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2">Ativo</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Limite termico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ativos.map((ativo) => (
                        <tr key={ativo.id} className="cursor-pointer border-b border-border/70" onClick={() => void carregarDetalheAtivo(ativo.id)}>
                          <td className="py-2">{ativo.nome}</td>
                          <td className="py-2">{statusBadge(ativo.status)}</td>
                          <td className="py-2">{ativo.limiteTemp} C</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Editar ativo</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <Input placeholder="Nome" value={ativoNomeEdicao} onChange={(event) => setAtivoNomeEdicao(event.target.value)} />
                <Input placeholder="Limite térmico" type="number" value={ativoLimiteEdicao} onChange={(event) => setAtivoLimiteEdicao(event.target.value)} />
                <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={ativoStatusEdicao} onChange={(event) => setAtivoStatusEdicao(event.target.value)}>
                  <option value="OPERACIONAL">OPERACIONAL</option>
                  <option value="MANUTENCAO">MANUTENCAO</option>
                  <option value="FALHA">FALHA</option>
                </select>
                <div className="flex gap-2">
                  <Button disabled={!ativoSelecionadoId || isUpdatingAtivo} onClick={() => void atualizarAtivo()}>
                    {isUpdatingAtivo ? 'Salvando...' : 'Salvar ativo'}
                  </Button>
                  <Button variant="outline" disabled={!ativoSelecionadoId || isDeletingAtivo} onClick={() => void excluirAtivo()}>
                    {isDeletingAtivo ? 'Excluindo...' : 'Excluir ativo'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'ativos-cadastro':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <Card>
              <CardHeader>
                <CardTitle>Novo ativo</CardTitle>
                <CardDescription>Cadastro rapido com limite termico (RF-04 / RN-06).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Nome do ativo" value={novoAtivoNome} onChange={(event) => setNovoAtivoNome(event.target.value)} />
                <Input placeholder="Limite termico (C)" type="number" value={novoAtivoLimiteTemp} onChange={(event) => setNovoAtivoLimiteTemp(event.target.value)} />
                <Button disabled={!novoAtivoNome || isCreatingAtivo} onClick={() => void createAtivo()}>
                  {isCreatingAtivo ? 'Salvando...' : 'Cadastrar ativo'}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'os-lista':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            {!isTecnico ? (
              <Card>
                <CardHeader>
                  <CardTitle>Criar ordem de servico</CardTitle>
                  <CardDescription>Fluxo de abertura manual por unidade (RF-05).</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-muted-foreground">Ativo</label>
                    <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={novaOsAtivoId} onChange={(event) => setNovaOsAtivoId(event.target.value)}>
                      <option value="">Selecione um ativo</option>
                      {ativos.map((ativo) => <option key={ativo.id} value={ativo.id}>{ativo.nome}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-muted-foreground">Tipo</label>
                    <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={novaOsTipo} onChange={(event) => setNovaOsTipo(event.target.value)}>
                      <option value="PREVENTIVA">PREVENTIVA</option>
                      <option value="CORRETIVA">CORRETIVA</option>
                      <option value="PREDITIVA">PREDITIVA</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <Input placeholder="Descricao da ordem" value={novaOsDescricao} onChange={(event) => setNovaOsDescricao(event.target.value)} />
                  </div>

                  <div className="md:col-span-2">
                    <Button disabled={isCreatingOs || !novaOsAtivoId || !novaOsDescricao} onClick={() => void createOs()}>
                      {isCreatingOs ? 'Criando...' : 'Criar OS'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Alert className="border-amber-200 bg-amber-50 text-amber-700">
                Perfil TECNICO pode visualizar e operar apenas ordens de servico atribuidas a voce.
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Ordens da unidade</CardTitle>
                <CardDescription>Fila operacional com status atual.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2">Ativo</th>
                        <th className="py-2">Tipo</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Abertura</th>
                        <th className="py-2">Descricao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordens.map((ordem) => (
                        <tr key={ordem.id} className="cursor-pointer border-b border-border/70" onClick={() => { void carregarDetalheOs(ordem.id); setActiveScreen('os-detalhe'); }}>
                          <td className="py-2">{ordem.ativoNome}</td>
                          <td className="py-2">{ordem.tipo}</td>
                          <td className="py-2">{statusBadge(ordem.status)}</td>
                          <td className="py-2">{formatDate(ordem.dataAbertura)}</td>
                          <td className="py-2">{ordem.descricao}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'os-detalhe':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <Card>
              <CardHeader>
                <CardTitle>Execucao e fechamento da OS</CardTitle>
                <CardDescription>Fluxo móvel para técnico com evidências fotográficas (RN-02 / RN-13).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-muted-foreground">Selecionar OS</label>
                  <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={ordemSelecionadaId} onChange={(event) => setOrdemSelecionadaId(event.target.value)}>
                    <option value="">Selecione</option>
                    {ordens.map((ordem) => <option key={ordem.id} value={ordem.id}>{ordem.ativoNome} · {ordem.tipo} · {ordem.status}</option>)}
                  </select>
                </div>

                {ordemSelecionada ? (
                  <div className="rounded-lg border border-border bg-background p-3 text-sm">
                    <p><strong>Ativo:</strong> {ordemSelecionada.ativoNome}</p>
                    <p><strong>Status:</strong> {ordemSelecionada.status}</p>
                    <p><strong>Abertura:</strong> {formatDate(ordemSelecionada.dataAbertura)}</p>
                    <p><strong>Descricao:</strong> {ordemSelecionada.descricao}</p>
                  </div>
                ) : null}

                {!isTecnico ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input placeholder="Descrição para edição da OS" value={osDescricaoEdicao} onChange={(event) => setOsDescricaoEdicao(event.target.value)} />
                    <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={osTecnicoEdicaoId} onChange={(event) => setOsTecnicoEdicaoId(event.target.value)}>
                      <option value="">Sem técnico</option>
                      {usuarios.map((usuario) => <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>)}
                    </select>
                  </div>
                ) : null}

                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
                  Use preferencialmente a câmera traseira no celular/tablet para registrar as evidências em campo.
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {renderFotoUploadField({
                    title: 'Foto de anexo geral',
                    helper: 'Evidência complementar da execução.',
                    file: fotoAnexoFile,
                    onChange: setFotoAnexoFile,
                  })}
                  {renderFotoUploadField({
                    title: 'Foto do problema',
                    helper: 'Obrigatória para OS corretiva.',
                    required: ordemSelecionada?.tipo === 'CORRETIVA',
                    file: fotoProblemaFile,
                    onChange: setFotoProblemaFile,
                  })}
                  {renderFotoUploadField({
                    title: 'Foto da solução',
                    helper: 'Obrigatória para OS corretiva.',
                    required: ordemSelecionada?.tipo === 'CORRETIVA',
                    file: fotoSolucaoFile,
                    onChange: setFotoSolucaoFile,
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!isTecnico ? (
                    <Button variant="outline" disabled={!ordemSelecionadaId || isEditingOs} onClick={() => void editarOrdemServico()}>
                      {isEditingOs ? 'Salvando...' : 'Salvar edição'}
                    </Button>
                  ) : null}
                  <Button variant="outline" disabled={!ordemSelecionadaId || isUpdatingOs} onClick={() => void updateOrdem('iniciar')}>Iniciar execucao</Button>
                  {!isTecnico ? (
                    <Button variant="outline" disabled={!ordemSelecionadaId || isUpdatingOs} onClick={() => void updateOrdem('cancelar')}>Cancelar OS</Button>
                  ) : null}
                  <Button disabled={!ordemSelecionadaId || isUpdatingOs} onClick={() => void updateOrdem('fechar')}>
                    {isUpdatingOs ? 'Atualizando...' : 'Fechar OS'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'dashboard':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card><CardHeader><CardDescription>Backlog OS</CardDescription><CardTitle>{kpi.ordensAbertas}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Execucao em curso</CardDescription><CardTitle>{kpi.ordensExecucao}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Conclusoes</CardDescription><CardTitle>{kpi.ordensConcluidas}</CardTitle></CardHeader></Card>
              <Card><CardHeader><CardDescription>Base de ativos</CardDescription><CardTitle>{ativos.length}</CardTitle></CardHeader></Card>
            </div>
          </div>
        );

      case 'auditoria':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <Card>
              <CardHeader>
                <CardTitle>Trilha de auditoria operacional</CardTitle>
                <CardDescription>Consulta real da colecao log_auditoria no MongoDB.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-muted-foreground">De</label>
                    <Input type="datetime-local" value={auditFrom} onChange={(event) => setAuditFrom(event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-muted-foreground">Ate</label>
                    <Input type="datetime-local" value={auditTo} onChange={(event) => setAuditTo(event.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" disabled={isLoadingAudit} onClick={() => void loadAuditLogs()}>
                      {isLoadingAudit ? 'Consultando...' : 'Atualizar auditoria'}
                    </Button>
                  </div>
                </div>

                {auditLogs.length === 0 ? <p className="text-muted-foreground">Nenhum evento encontrado.</p> : null}
                {auditLogs.map((item) => (
                  <div key={item.idLog} className="rounded-md border border-border bg-background p-3">
                    <p><strong>{item.entidadeAfetada}</strong> · registro {item.idRegistro.slice(0, 8)}</p>
                    <p className="text-muted-foreground">{formatDate(item.dataHora)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case 'usuarios':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <Card>
              <CardHeader>
                <CardTitle>Convidar colaborador</CardTitle>
                <CardDescription>
                  Convite operacional para colaborador da empresa autenticada (perfil e unidade).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
                  <p>Empresa em contexto: {backendMe?.usuario?.empresa?.nomeEmpresa ?? 'N/D'} ({backendMe?.usuario?.empresa?.slug ?? 'sem-slug'})</p>
                  <p>Use esta tela para colaboradores. Ativacao de nova empresa deve ser feita no portal da plataforma.</p>
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.location.href = getPlatformPortalPath();
                        }
                      }}
                    >
                      Ir para ativacao de empresa
                    </Button>
                  </div>
                </div>
                {!canInviteUsers ? (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-700">
                    Seu usuario nao possui a permissao `usuario.convidar`.
                  </Alert>
                ) : null}
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="Email do colaborador"
                    type="email"
                    value={conviteEmailDestino}
                    onChange={(event) => setConviteEmailDestino(event.target.value)}
                  />
                  <Input
                    placeholder="Nome (opcional)"
                    value={conviteNomeDestino}
                    onChange={(event) => setConviteNomeDestino(event.target.value)}
                  />
                  <select
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    value={conviteCargoCodigo}
                    onChange={(event) => setConviteCargoCodigo(event.target.value as CargoConvite)}
                  >
                    <option value="TECNICO">TECNICO</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="GESTOR">GESTOR</option>
                    <option value="AUDITOR">AUDITOR</option>
                    <option value="ADMIN">Administrador empresa</option>
                  </select>
                  <select
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                    value={conviteUnidadeDestinoId}
                    onChange={(event) => setConviteUnidadeDestinoId(event.target.value)}
                  >
                    <option value="">Unidade atual ({unidadeAtual?.nome ?? 'nao selecionada'})</option>
                    {unidades.map((unidade) => (
                      <option key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  disabled={!canInviteUsers || !conviteEmailDestino.trim() || isSendingInvite}
                  onClick={() => void enviarConviteUsuario()}
                >
                  {isSendingInvite ? 'Enviando convite...' : 'Enviar convite'}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Usuarios da unidade</CardTitle>
                <CardDescription>Leitura operacional de usuarios vinculados.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2">Nome</th>
                        <th className="py-2">Email</th>
                        <th className="py-2">Perfil</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((usuario) => (
                        <tr key={usuario.id} className="cursor-pointer border-b border-border/70" onClick={() => void carregarDetalheUsuario(usuario.id)}>
                          <td className="py-2">{usuario.nome}</td>
                          <td className="py-2">{usuario.email}</td>
                          <td className="py-2">{formatPerfilLabel(usuario.perfil)}</td>
                          <td className="py-2">{statusBadge(usuario.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            {usuarioSelecionadoId ? (
              <p className="text-sm text-muted-foreground">Usuário selecionado: {usuarioSelecionadoId}</p>
            ) : null}
          </div>
        );

      case 'permissoes':
        return (
          <div className="space-y-4">
            {renderSharedHeader('empresa')}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => void carregarDetalheUnidade()}>Carregar detalhe da unidade</Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Permissoes do contexto atual</CardTitle>
                <CardDescription>Visao de cargos e permissoes retornadas no /me.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(backendMe?.usuario?.cargos ?? []).map((cargo) => (
                  <div key={cargo.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                    <p><strong>{cargo.nome}</strong> ({formatPerfilLabel(cargo.codigo)})</p>
                    <p className="text-muted-foreground">Nivel {cargo.nivelHierarquico} · Unidade {cargo.idUnidade ?? 'Corporativo'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cargo.permissoes.map((permissao) => (
                        <span key={permissao} className="rounded-full bg-muted px-2 py-0.5 text-xs">{permissao}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            {unidadeDetalhe ? (
              <Card>
                <CardHeader><CardTitle>Detalhe da unidade</CardTitle></CardHeader>
                <CardContent className="text-sm">
                  <p><strong>ID:</strong> {unidadeDetalhe.id}</p>
                  <p><strong>Nome:</strong> {unidadeDetalhe.nome}</p>
                  <p><strong>Localização:</strong> {unidadeDetalhe.localizacao}</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        );

      case 'unidades':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <div className="flex justify-end">
              <Button variant="outline" disabled={!selectedUnidadeId} onClick={() => void carregarDetalheUnidade()}>
                Atualizar detalhe da unidade selecionada
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Mapa de unidades</CardTitle>
                <CardDescription>Contexto organizacional para operacao e integracao.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {unidades.map((unidade) => (
                  <button
                    key={unidade.id}
                    className={`rounded-lg border p-3 text-left text-sm ${selectedUnidadeId === unidade.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted'}`}
                    onClick={() => {
                      setSelectedUnidadeId(unidade.id);
                      void carregarDetalheUnidade(unidade.id);
                    }}
                  >
                    <p className="font-semibold">{unidade.nome}</p>
                    <p className="text-muted-foreground">{unidade.localizacao || 'Sem localizacao'}</p>
                    <p className="text-xs text-muted-foreground">ID: {unidade.id}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
            {unidadeDetalhe ? (
              <Card>
                <CardHeader>
                  <CardTitle>Detalhe da unidade</CardTitle>
                  <CardDescription>Informações da unidade selecionada para gestão e consulta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p><strong>ID:</strong> {unidadeDetalhe.id}</p>
                  <p><strong>Nome:</strong> {unidadeDetalhe.nome}</p>
                  <p><strong>Localização:</strong> {unidadeDetalhe.localizacao || 'Sem localização'}</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    {canOpenUsuariosScreen ? <Button variant="outline" onClick={() => setActiveScreen('usuarios')}>Ver usuários da unidade</Button> : null}
                    {canOpenAtivosScreen ? <Button variant="outline" onClick={() => setActiveScreen('ativos-lista')}>Ver ativos da unidade</Button> : null}
                    {canOpenOsScreen ? <Button variant="outline" onClick={() => setActiveScreen('os-lista')}>Ver ordens da unidade</Button> : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        );

      case 'iot':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <Card>
              <CardHeader>
                <CardTitle>Simulador IoT</CardTitle>
                <CardDescription>Gera sinais para validar alertas e fluxos operacionais (RF-19).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={simulateReading}>Gerar leitura simulada</Button>
                <div className="space-y-2">
                  {simulatedReadings.map((reading) => (
                    <div key={reading.id} className="rounded-md border border-border bg-background p-3 text-sm">
                      <p><strong>{reading.ativo}</strong> · {reading.temperatura.toFixed(1)} C</p>
                      <p className="text-muted-foreground">{formatDate(reading.momento)} · {reading.origem}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'notificacoes':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <Card>
              <CardHeader>
                <CardTitle>Centro de notificacoes</CardTitle>
                <CardDescription>Alertas operacionais e sinais de telemetria.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {notificacoes.length === 0 ? <p className="text-muted-foreground">Sem alertas ativos no momento.</p> : null}
                {notificacoes.map((notification) => (
                  <div key={notification.id} className="rounded-md border border-border bg-background p-3">
                    <p className="font-semibold">{notification.nivel}</p>
                    <p>{notification.texto}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case 'relatorios':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <Card>
              <CardHeader>
                <CardTitle>Resumo para exportacao</CardTitle>
                <CardDescription>Exportacao real em CSV (Excel) ou PDF com filtro por periodo/unidade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Total de ativos: {ativos.length}</p>
                <p>Total de ordens: {ordens.length}</p>
                <p>Ordens concluidas: {kpi.ordensConcluidas}</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-muted-foreground">De</label>
                    <Input type="datetime-local" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-muted-foreground">Ate</label>
                    <Input type="datetime-local" value={reportTo} onChange={(event) => setReportTo(event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-[0.08em] text-muted-foreground">Formato</label>
                    <select className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={reportFormato} onChange={(event) => setReportFormato(event.target.value as 'excel' | 'pdf')}>
                      <option value="excel">Excel (CSV)</option>
                      <option value="pdf">PDF</option>
                    </select>
                  </div>
                </div>
                <Button disabled={isExportingReport} onClick={() => void exportReport()}>
                  {isExportingReport ? 'Exportando...' : 'Exportar relatorio'}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'integracoes':
        return (
          <div className="space-y-4">
            {renderSharedHeader()}
            <div className="flex justify-end">
              <Button variant="outline" disabled={isLoadingIntegracoes} onClick={() => void loadIntegracoesStatus()}>
                {isLoadingIntegracoes ? 'Verificando...' : 'Atualizar status'}
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Broker de mensagens</CardTitle>
                  <CardDescription>Pipeline operacional para eventos assíncronos.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>Status: {integracoesStatus?.integrations.rabbitmq.ok ? 'ONLINE' : 'INDISPONIVEL'}</p>
                  <p className="text-muted-foreground">{integracoesStatus?.integrations.rabbitmq.message ?? 'Sem dados.'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gateway IoT</CardTitle>
                  <CardDescription>Entrada de sensores e normalizacao de leituras.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>Status: {integracoesStatus?.integrations.iot.ok ? 'ONLINE' : 'INDISPONIVEL'}</p>
                  <p className="text-muted-foreground">{integracoesStatus?.integrations.iot.message ?? 'Sem dados.'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Integracao SMTP</CardTitle>
                  <CardDescription>Canal de notificacao e convites.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>Status: {integracoesStatus?.integrations.smtp.ok ? 'ONLINE' : 'INDISPONIVEL'}</p>
                  <p className="text-muted-foreground">{integracoesStatus?.integrations.smtp.message ?? 'Sem dados.'}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>MongoDB / Auditoria</CardTitle>
                  <CardDescription>Status da trilha de auditoria.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <p>Status: {integracoesStatus?.integrations.mongodb.ok ? 'ONLINE' : 'INDISPONIVEL'}</p>
                  <p className="text-muted-foreground">{integracoesStatus?.integrations.mongodb.message ?? 'Sem dados.'}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'configuracoes':
        return (
          <div className="space-y-4">
            {renderSharedHeader('empresa')}
            <Card>
              <CardHeader>
                <CardTitle>Painel de configuracao da base</CardTitle>
                <CardDescription>Centraliza ajustes de governanca, acessos e estrutura do cliente.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <button className="rounded-lg border border-border bg-background p-4 text-left hover:bg-muted" onClick={() => setActiveScreen('permissoes')}>
                  <p className="font-semibold">Permissoes e cargos</p>
                  <p className="mt-1 text-sm text-muted-foreground">Gerencie niveis de acesso do contexto atual.</p>
                </button>
                <button className="rounded-lg border border-border bg-background p-4 text-left hover:bg-muted" onClick={() => setActiveScreen('usuarios')}>
                  <p className="font-semibold">Usuarios e convites</p>
                  <p className="mt-1 text-sm text-muted-foreground">Convide colaboradores e revise vinculos por unidade.</p>
                </button>
                <button className="rounded-lg border border-border bg-background p-4 text-left hover:bg-muted" onClick={() => setActiveScreen('unidades')}>
                  <p className="font-semibold">Estrutura de unidades</p>
                  <p className="mt-1 text-sm text-muted-foreground">Visualize a organizacao fabril da empresa.</p>
                </button>
                <button className="rounded-lg border border-border bg-background p-4 text-left hover:bg-muted" onClick={() => setActiveScreen('integracoes')}>
                  <p className="font-semibold">Saude de integracoes</p>
                  <p className="mt-1 text-sm text-muted-foreground">Monitore status de SMTP, RabbitMQ, MongoDB e IoT.</p>
                </button>
                <button className="rounded-lg border border-border bg-background p-4 text-left hover:bg-muted" onClick={() => setActiveScreen('dashboard')}>
                  <p className="font-semibold">Indicadores executivos</p>
                  <p className="mt-1 text-sm text-muted-foreground">Acompanhe desempenho operacional por unidade.</p>
                </button>
              </CardContent>
            </Card>

            {isLoadingGestao ? (
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <Skeleton className="h-5 w-52" />
                  <Skeleton className="h-4 w-80" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ) : null}

            {gestaoPainel ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Acesso da base do cliente</CardTitle>
                    <CardDescription>Link oficial para entrada no ambiente da empresa.</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p><strong>Empresa:</strong> {gestaoPainel.empresa.nomeEmpresa}</p>
                    <p><strong>Slug:</strong> {gestaoPainel.empresa.slug}</p>
                    <p><strong>Link de acesso:</strong> {gestaoPainel.links.acessoConta ?? 'Não configurado no backend (.env)'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Gestão de usuários</CardTitle>
                    <CardDescription>Ativar, bloquear, alterar perfil e gerar reset de senha.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto">
                      <table className="w-full min-w-[900px] text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-muted-foreground">
                            <th className="py-2">Nome</th>
                            <th className="py-2">Email</th>
                            <th className="py-2">Perfil</th>
                            <th className="py-2">Status</th>
                            <th className="py-2">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gestaoPainel.usuarios.map((usuario) => (
                            <tr key={usuario.id} className="border-b border-border/70">
                              <td className="py-2">{usuario.nome}</td>
                              <td className="py-2">{usuario.email}</td>
                              <td className="py-2">
                                <select
                                  className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                                  value={usuario.perfil}
                                  onChange={(event) => void atualizarPerfilUsuarioGestao(usuario.id, event.target.value)}
                                  disabled={isSavingGestao}
                                >
                                  <option value="TECNICO">TECNICO</option>
                                  <option value="SUPERVISOR">SUPERVISOR</option>
                                  <option value="GESTOR">GESTOR</option>
                                  <option value="AUDITOR">AUDITOR</option>
                                  <option value="ADMIN">ADMIN</option>
                                </select>
                              </td>
                              <td className="py-2">{statusBadge(usuario.status)}</td>
                              <td className="py-2">
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" disabled={isSavingGestao} onClick={() => void atualizarStatusUsuarioGestao(usuario.id, 'ATIVO')}>Ativar</Button>
                                  <Button size="sm" variant="outline" disabled={isSavingGestao} onClick={() => void atualizarStatusUsuarioGestao(usuario.id, 'INATIVO')}>Inativar</Button>
                                  <Button size="sm" variant="outline" disabled={isSavingGestao} onClick={() => void atualizarStatusUsuarioGestao(usuario.id, 'BLOQUEADO')}>Bloquear</Button>
                                  <Button size="sm" disabled={isSavingGestao} onClick={() => void gerarResetSenhaUsuario(usuario.id)}>Reset senha</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Criar cargo personalizado</CardTitle>
                    <CardDescription>Defina código, nível hierárquico e permissões do novo cargo.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        placeholder="Código (ex.: PLANEJADOR)"
                        value={novoCargoCodigo}
                        onChange={(event) => setNovoCargoCodigo(event.target.value)}
                      />
                      <Input
                        placeholder="Nome do cargo"
                        value={novoCargoNome}
                        onChange={(event) => setNovoCargoNome(event.target.value)}
                      />
                      <Input
                        placeholder="Descrição (opcional)"
                        value={novoCargoDescricao}
                        onChange={(event) => setNovoCargoDescricao(event.target.value)}
                      />
                      <Input
                        placeholder="Nível hierárquico (1-100)"
                        type="number"
                        min={1}
                        max={100}
                        value={novoCargoNivel}
                        onChange={(event) => setNovoCargoNivel(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {gestaoPainel.permissoes.map((permissao) => (
                        <label key={`novo-${permissao.codigo}`} className="flex items-start gap-2 rounded-md border border-border p-2 text-xs">
                          <input
                            type="checkbox"
                            checked={novoCargoPermissoes.includes(permissao.codigo)}
                            onChange={() => toggleNovaPermissaoCargo(permissao.codigo)}
                            disabled={isSavingGestao}
                          />
                          <span>
                            <strong>{permissao.codigo}</strong>
                            <span className="block text-muted-foreground">{permissao.nome}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <Button disabled={isSavingGestao || !novoCargoCodigo.trim() || !novoCargoNome.trim()} onClick={() => void criarCargoPersonalizado()}>
                      {isSavingGestao ? 'Criando cargo...' : 'Criar cargo personalizado'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cargos e permissões</CardTitle>
                    <CardDescription>Controle dinâmico de permissões por cargo da empresa.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gestaoPainel.cargos.map((cargo) => (
                      <div key={cargo.id} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold">{cargo.nome} ({cargo.codigo})</p>
                            <p className="text-xs text-muted-foreground">Nível {cargo.nivelHierarquico}</p>
                          </div>
                          <Button size="sm" disabled={isSavingGestao} onClick={() => void salvarPermissoesCargo(cargo.id)}>
                            Salvar permissões
                          </Button>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {gestaoPainel.permissoes.map((permissao) => {
                            const checked = (editingCargoPermissoes[cargo.id] ?? []).includes(permissao.codigo);
                            return (
                              <label key={`${cargo.id}-${permissao.codigo}`} className="flex items-start gap-2 rounded-md border border-border p-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePermissaoCargo(cargo.id, permissao.codigo)}
                                  disabled={isSavingGestao}
                                />
                                <span>
                                  <strong>{permissao.codigo}</strong>
                                  <span className="block text-muted-foreground">{permissao.nome}</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        );

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Tela indisponivel</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">A tela solicitada nao esta habilitada para este perfil.</CardContent>
          </Card>
        );
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[300px_1fr]">
      <aside className="border-r border-border bg-card/70 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">ManuCMMS</p>
        <h2 className="mt-2 font-display text-xl font-semibold">Centro operacional</h2>
        <p className="text-sm text-muted-foreground">{backendMe?.usuario?.empresa?.nomeEmpresa ?? 'Ambiente padrao'}</p>

        <nav className="mt-4 space-y-2">
          {visibleModules.map((moduleDef) => {
            const Icon = moduleDef.icon;
            const isExpanded = expandedModules[moduleDef.key];
            return (
              <div key={moduleDef.key} className="rounded-md border border-border bg-background">
                <button
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                  onClick={() => setExpandedModules((current) => ({ ...current, [moduleDef.key]: !current[moduleDef.key] }))}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Icon className="h-4 w-4" />
                    {moduleDef.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{isExpanded ? 'Ocultar' : 'Abrir'}</span>
                </button>
                {isExpanded ? (
                  <div className="space-y-1 border-t border-border p-2">
                    {moduleDef.screens.map((screen) => {
                      const ScreenIcon = screen.icon;
                      return (
                        <button
                          key={screen.key}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${activeScreen === screen.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                          onClick={() => setActiveScreen(screen.key)}
                        >
                          <ScreenIcon className="h-4 w-4" />
                          {screen.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="mt-4 rounded-md border border-border bg-background p-3 text-sm">
          <p className="font-medium">{backendMe?.usuario?.nome ?? session.user.email}</p>
          <p className="text-muted-foreground">Perfil {formatPerfilLabel(perfil)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{backendMe?.usuario?.empresa?.slug ?? 'tenant-padrao'}</p>
        </div>

        <Button className="mt-3 w-full" variant="outline" onClick={() => void onSignOut()}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </aside>

      <main className="p-5 md:p-7">
        <h1 className="font-display text-2xl font-semibold">{currentScreen?.label}</h1>
        <p className="mb-4 text-sm text-muted-foreground">{currentScreen?.desc}</p>

        {authWarning ? (
          <Card className="mb-4 border-amber-300">
            <CardContent className="pt-6 text-sm">{authWarning}</CardContent>
          </Card>
        ) : null}

        {renderScreen()}

        <div className="mt-6 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          <p className="inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Escopo aplicado por perfil, permissoes e unidade.</p>
        </div>
      </main>
    </div>
  );
}
