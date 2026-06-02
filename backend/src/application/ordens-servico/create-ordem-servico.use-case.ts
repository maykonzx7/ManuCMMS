import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import {
  ATIVO_REPOSITORY_PORT,
  type IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
  type CreateOrdemServicoInput,
  type IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import {
  USUARIO_READ_PORT,
  type IUsuarioReadPort,
} from '../../domain/ports/usuario-read.port';
import { EMAIL_PORT, type IEmailPort } from '../../domain/ports/email.port';
import { NotificacaoService } from '../notificacoes/notificacao.service';
import { publishOrdemServicoStatus } from '../shared/ordem-servico-realtime.shared';
import { resolveFrontendBaseUrl } from '../shared/frontend-link.shared';

const TIPOS_VALIDOS: OrdemServicoListaItem['tipo'][] = [
  'CORRETIVA',
  'PREVENTIVA',
  'PREDITIVA',
];

const PRIORIDADES_VALIDAS: OrdemServicoListaItem['prioridade'][] = [
  'BAIXA',
  'MEDIA',
  'ALTA',
  'CRITICA',
];

const DESCRICAO_MAX = 32_000;
const SLA_HORAS_PADRAO: Record<OrdemServicoListaItem['tipo'], number> = {
  CORRETIVA: 24,
  PREVENTIVA: 168,
  PREDITIVA: 72,
};

@Injectable()
export class CreateOrdemServicoUseCase {
  constructor(
    private readonly config: ConfigService,
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
    @Inject(EMAIL_PORT)
    private readonly emailPort: IEmailPort,
    private readonly notificacoes: NotificacaoService,
  ) {}

  async execute(
    idUnidade: string,
    body: {
      idAtivo: string;
      tipo: string;
      descricao: string;
      prioridade?: string;
      idTecnico?: string | null;
    },
    criadoPorUsuarioId: string,
  ): Promise<OrdemServicoListaItem> {
    const unidadeOk = await this.unidades.findById(idUnidade);
    if (!unidadeOk) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }
    if (!unidadeOk.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const tipo = body.tipo as OrdemServicoListaItem['tipo'];
    if (!TIPOS_VALIDOS.includes(tipo)) {
      throw new BadRequestException(
        `tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}`,
      );
    }

    const prioridadeRaw = (body.prioridade ?? 'MEDIA').toUpperCase();
    const prioridade = prioridadeRaw as OrdemServicoListaItem['prioridade'];
    if (!PRIORIDADES_VALIDAS.includes(prioridade)) {
      throw new BadRequestException(
        `prioridade deve ser uma de: ${PRIORIDADES_VALIDAS.join(', ')}`,
      );
    }

    const descricao = body.descricao?.trim() ?? '';
    if (descricao.length === 0 || descricao.length > DESCRICAO_MAX) {
      throw new BadRequestException(
        `descricao é obrigatória e deve ter até ${DESCRICAO_MAX} caracteres`,
      );
    }

    const ativoOk = await this.ativos.existsInUnidade(
      unidadeOk.empresaId,
      body.idAtivo,
      idUnidade,
    );
    if (!ativoOk) {
      throw new NotFoundException('Ativo não encontrado nesta unidade fabril');
    }

    const statusAtivo = await this.ativos.getStatusInUnidade(
      unidadeOk.empresaId,
      body.idAtivo,
      idUnidade,
    );
    if (statusAtivo === 'MANUTENCAO') {
      throw new ConflictException(
        'Ativo em manutenção — não é permitida nova OS até encerrar a atual (RN-10)',
      );
    }
    if (statusAtivo === 'INATIVO') {
      throw new ConflictException(
        'Ativo inativo — ative o ativo para permitir abertura de nova OS.',
      );
    }

    let idTecnico: string | null | undefined = body.idTecnico;
    if (idTecnico === '' || idTecnico === undefined) {
      idTecnico = undefined;
    }
    let tecnicoSelecionado: Awaited<
      ReturnType<IUsuarioReadPort['findByIdInUnidade']>
    > | null = null;
    if (idTecnico != null) {
      tecnicoSelecionado = await this.usuarios.findByIdInUnidade(
        idTecnico,
        idUnidade,
      );
      if (!tecnicoSelecionado) {
        throw new NotFoundException(
          'Técnico não encontrado nesta unidade fabril',
        );
      }
      if (tecnicoSelecionado.perfil !== 'TECNICO') {
        throw new BadRequestException(
          'Usuario atribuido precisa ter perfil TECNICO',
        );
      }
    }

    const payload: CreateOrdemServicoInput = {
      empresaId: unidadeOk.empresaId,
      idUnidade,
      idAtivo: body.idAtivo,
      tipo,
      prioridade,
      descricao,
      dataLimiteSla: this.resolveSlaDeadline(tipo, unidadeOk),
      idTecnico,
      criadoPorUsuarioId,
    };

    try {
      const ordem = await this.ordens.create(payload);
      await this.notifyOsAssigned({
        ordem,
        unidadeNome: unidadeOk.nome,
        unidadeId: idUnidade,
        empresaId: unidadeOk.empresaId,
        tecnico: tecnicoSelecionado,
      });
      await this.sendTecnicoAssignedEmail({
        tecnico: tecnicoSelecionado,
        ordem,
        unidadeNome: unidadeOk.nome,
        idUnidade,
        empresaSlug: unidadeOk.empresaSlug ?? null,
      });
      publishOrdemServicoStatus(this.notificacoes, idUnidade, ordem);
      return ordem;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new NotFoundException('Referência inválida (ativo ou técnico)');
      }
      throw e;
    }
  }

  private resolveSlaDeadline(
    tipo: OrdemServicoListaItem['tipo'],
    unidade: {
      slaCorretivaHoras?: number | null;
      slaPreventivaHoras?: number | null;
      slaPreditivaHoras?: number | null;
    },
  ): Date {
    const unidadeMap: Record<
      OrdemServicoListaItem['tipo'],
      number | null | undefined
    > = {
      CORRETIVA: unidade.slaCorretivaHoras,
      PREVENTIVA: unidade.slaPreventivaHoras,
      PREDITIVA: unidade.slaPreditivaHoras,
    };
    const envMap: Record<OrdemServicoListaItem['tipo'], string> = {
      CORRETIVA: 'OS_SLA_CORRETIVA_HORAS',
      PREVENTIVA: 'OS_SLA_PREVENTIVA_HORAS',
      PREDITIVA: 'OS_SLA_PREDITIVA_HORAS',
    };
    const fallback = SLA_HORAS_PADRAO[tipo];
    const fromUnidade = Number(unidadeMap[tipo]);
    if (Number.isFinite(fromUnidade) && fromUnidade > 0) {
      return new Date(Date.now() + fromUnidade * 60 * 60 * 1000);
    }
    const parsed = Number(this.config.get<string>(envMap[tipo]) ?? fallback);
    const horas = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    return new Date(Date.now() + horas * 60 * 60 * 1000);
  }

  private async notifyOsAssigned(input: {
    ordem: OrdemServicoListaItem;
    unidadeNome: string;
    unidadeId: string;
    empresaId: string;
    tecnico: Awaited<ReturnType<IUsuarioReadPort['findByIdInUnidade']>> | null;
  }) {
    const { ordem, unidadeNome, unidadeId, empresaId, tecnico } = input;
    const usuarios = await this.usuarios.listByUnidade(unidadeId);
    const admins = usuarios.filter((u) => u.perfil === 'ADMIN');
    const linkPath = `/workspace/ordens/${ordem.id}`;

    if (tecnico?.id) {
      await this.notificacoes.create({
        usuarioId: tecnico.id,
        empresaId,
        idUnidade: unidadeId,
        ordemServicoId: ordem.id,
        tipo: 'info',
        titulo: 'Nova OS atribuida a voce',
        mensagem: `OS ${ordem.id.slice(0, 8).toUpperCase()} atribuida para execucao no ativo ${ordem.ativoNome}. Unidade: ${unidadeNome}.`,
        linkPath,
      });
    }

    for (const admin of admins) {
      await this.notificacoes.create({
        usuarioId: admin.id,
        empresaId,
        idUnidade: unidadeId,
        ordemServicoId: ordem.id,
        tipo: 'warning',
        titulo: 'OS criada e atribuida',
        mensagem: `A OS ${ordem.id.slice(0, 8).toUpperCase()} foi criada${tecnico?.nome ? ` e atribuida ao tecnico ${tecnico.nome}` : ''}. Ativo: ${ordem.ativoNome}.`,
        linkPath,
      });
    }
  }

  private async sendTecnicoAssignedEmail(input: {
    tecnico: Awaited<ReturnType<IUsuarioReadPort['findByIdInUnidade']>> | null;
    ordem: OrdemServicoListaItem;
    unidadeNome: string;
    idUnidade: string;
    empresaSlug: string | null;
  }): Promise<void> {
    const { tecnico, ordem, unidadeNome, idUnidade, empresaSlug } = input;
    if (!tecnico?.email || !this.emailPort.isConfigured()) {
      return;
    }

    const frontendBaseUrl = resolveFrontendBaseUrl({
      frontendNgrokBaseUrl: this.config.get<string>(
        'FRONTEND_NGROK_PUBLIC_BASE_URL',
      ),
      frontendPublicBaseUrl: this.config.get<string>(
        'FRONTEND_PUBLIC_BASE_URL',
      ),
    });
    const accessPath =
      this.config.get<string>('FRONTEND_ACCESS_PORTAL_PATH')?.trim() ||
      '/workspace/acesso';
    const query = new URLSearchParams({
      redirect: `/workspace/ordens/${ordem.id}`,
      osId: ordem.id,
      unidadeId: idUnidade,
    });
    const normalizedEmpresaSlug = empresaSlug?.trim().toLowerCase() ?? '';
    const accessPathWithScope = normalizedEmpresaSlug
      ? `${accessPath.replace(/\/+$/, '')}/${normalizedEmpresaSlug}`
      : accessPath;
    const osLink = frontendBaseUrl
      ? `${frontendBaseUrl}${accessPathWithScope}?${query.toString()}`
      : null;

    const subject = `Nova OS atribuida: ${ordem.ativoNome} (${ordem.tipo})`;
    const text = [
      `Olá, ${tecnico.nome}.`,
      '',
      `Uma nova ordem de serviço foi atribuída a você.`,
      `OS: ${ordem.id}`,
      `Ativo: ${ordem.ativoNome}`,
      `Tipo: ${ordem.tipo}`,
      `Status: ${ordem.status}`,
      `Unidade: ${unidadeNome}`,
      osLink ? `Acesse: ${osLink}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const html = `
      <p>Olá, <strong>${tecnico.nome}</strong>.</p>
      <p>Uma nova ordem de serviço foi atribuída a você.</p>
      <ul>
        <li><strong>OS:</strong> ${ordem.id}</li>
        <li><strong>Ativo:</strong> ${ordem.ativoNome}</li>
        <li><strong>Tipo:</strong> ${ordem.tipo}</li>
        <li><strong>Status:</strong> ${ordem.status}</li>
        <li><strong>Unidade:</strong> ${unidadeNome}</li>
      </ul>
      ${osLink ? `<p><a href="${osLink}">Abrir OS agora</a></p>` : ''}
    `;

    try {
      await this.emailPort.send({ to: tecnico.email, subject, text, html });
    } catch {
      // Notificação por email é best-effort e não deve bloquear o fluxo de OS.
    }
  }
}
