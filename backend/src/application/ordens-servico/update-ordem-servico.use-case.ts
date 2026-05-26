import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
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
import { resolveFrontendBaseUrl } from '../shared/frontend-link.shared';

const DESCRICAO_MAX = 32_000;

@Injectable()
export class UpdateOrdemServicoUseCase {
  constructor(
    private readonly config: ConfigService,
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
    @Inject(EMAIL_PORT)
    private readonly emailPort: IEmailPort,
    private readonly notificacoes: NotificacaoService,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    body: {
      descricao?: string;
      idTecnico?: string | null;
      motivoTransferencia?: string;
    },
    executorUsuarioId: string,
  ): Promise<OrdemServicoListaItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const descricao = body.descricao?.trim();
    if (body.descricao !== undefined && (!descricao || descricao.length > DESCRICAO_MAX)) {
      throw new BadRequestException(
        `descricao deve ter entre 1 e ${DESCRICAO_MAX} caracteres`,
      );
    }

    let idTecnico = body.idTecnico;
    if (idTecnico === '') {
      idTecnico = null;
    }

    let tecnicoSelecionado:
      | Awaited<ReturnType<IUsuarioReadPort['findByIdInUnidade']>>
      | null = null;

    if (idTecnico !== undefined && idTecnico !== null) {
      tecnicoSelecionado = await this.usuarios.findByIdInUnidade(
        idTecnico,
        idUnidade,
      );
      if (!tecnicoSelecionado) {
        throw new NotFoundException('Técnico não encontrado nesta unidade fabril');
      }
      if (tecnicoSelecionado.perfil !== 'TECNICO') {
        throw new BadRequestException('Usuario atribuido precisa ter perfil TECNICO');
      }
    }

    if (descricao === undefined && idTecnico === undefined) {
      throw new BadRequestException('Informe ao menos um campo para atualização');
    }

    const atual = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      unidade.empresaId,
      idUnidade,
    );
    if (!atual) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    if (atual.status !== 'ABERTA') {
      throw new BadRequestException(
        'Somente OS ABERTA pode ser editada antes de iniciar execução.',
      );
    }

    const mudouTecnico =
      idTecnico !== undefined && (atual.idTecnico ?? null) !== (idTecnico ?? null);
    const motivoTransferencia = body.motivoTransferencia?.trim();
    if (mudouTecnico && (!motivoTransferencia || motivoTransferencia.length < 10)) {
      throw new BadRequestException(
        'Transferência de OS exige motivo com no mínimo 10 caracteres.',
      );
    }

    const atualizado = await this.ordens.updateDados({
      idOrdemServico,
      empresaId: unidade.empresaId,
      idUnidade,
      descricao,
      idTecnico,
      transferidoPorUsuarioId: mudouTecnico ? executorUsuarioId : undefined,
      motivoTransferencia: mudouTecnico ? motivoTransferencia : undefined,
    });

    if (!atualizado) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    if (mudouTecnico && atualizado.idTecnico) {
      const tecnicoDestino = tecnicoSelecionado
        ?? (await this.usuarios.findByIdInUnidade(atualizado.idTecnico, idUnidade));
      await this.notifyTecnicoReassigned({
        tecnico: tecnicoDestino,
        ordem: atualizado,
        unidadeNome: unidade.nome,
        unidadeId: idUnidade,
        empresaId: unidade.empresaId,
      });
      await this.sendTecnicoReassignedEmail({
        tecnico: tecnicoDestino,
        ordem: atualizado,
        unidadeNome: unidade.nome,
        idUnidade,
        empresaSlug: unidade.empresaSlug ?? null,
      });
    }

    return atualizado;
  }

  private async notifyTecnicoReassigned(input: {
    tecnico: Awaited<ReturnType<IUsuarioReadPort['findByIdInUnidade']>> | null;
    ordem: OrdemServicoListaItem;
    unidadeNome: string;
    unidadeId: string;
    empresaId: string;
  }): Promise<void> {
    const { tecnico, ordem, unidadeNome, unidadeId, empresaId } = input;
    if (!tecnico?.id) return;
    await this.notificacoes.create({
      usuarioId: tecnico.id,
      empresaId,
      idUnidade: unidadeId,
      ordemServicoId: ordem.id,
      tipo: 'info',
      titulo: 'OS atribuida a voce',
      mensagem: `A OS ${ordem.id.slice(0, 8).toUpperCase()} foi atribuida para voce. Ativo: ${ordem.ativoNome}. Unidade: ${unidadeNome}.`,
      linkPath: `/workspace/ordens/${ordem.id}`,
    });
  }

  private async sendTecnicoReassignedEmail(input: {
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
      frontendNgrokBaseUrl: this.config.get<string>('FRONTEND_NGROK_PUBLIC_BASE_URL'),
      frontendPublicBaseUrl: this.config.get<string>('FRONTEND_PUBLIC_BASE_URL'),
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

    const subject = `OS atribuida a voce: ${ordem.ativoNome} (${ordem.tipo})`;
    const text = [
      `Olá, ${tecnico.nome}.`,
      '',
      `Uma ordem de serviço foi atribuída a você.`,
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
      <p>Uma ordem de serviço foi atribuída a você.</p>
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
