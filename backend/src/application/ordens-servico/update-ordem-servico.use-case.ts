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
import { EventPublisherService } from '../../infrastructure/messaging/event-publisher.service';
import { NotificacaoService } from '../notificacoes/notificacao.service';
import { publishOrdemServicoStatus } from '../shared/ordem-servico-realtime.shared';
import { buildOrdemServicoAtribuidaEmail } from '../shared/email/email-template.shared';
import {
  canDeliverEmail,
  deliverTransactionalEmail,
} from '../shared/email/deliver-email.shared';
import { resolveFrontendBaseUrl } from '../shared/frontend-link.shared';
import { resolveOrdemServicoEmailLink } from '../shared/ordem-servico-link.shared';
import { parseOptionalOrdemServicoDate } from '../shared/parse-ordem-servico-date.shared';
import {
  promoverFilaTecnicoAposLiberarSlot,
  resolveStatusAtribuicaoTecnico,
} from '../shared/ordem-servico-tecnico-fila.shared';

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
    private readonly eventPublisher: EventPublisherService,
    private readonly notificacoes: NotificacaoService,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    body: {
      descricao?: string;
      idTecnico?: string | null;
      motivoTransferencia?: string;
      dataPrazoVencimento?: string | null;
      dataLimiteAtraso?: string | null;
    },
    executorUsuarioId: string,
    executorPerfil: string,
  ): Promise<OrdemServicoListaItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const descricao = body.descricao?.trim();
    if (
      body.descricao !== undefined &&
      (!descricao || descricao.length > DESCRICAO_MAX)
    ) {
      throw new BadRequestException(
        `descricao deve ter entre 1 e ${DESCRICAO_MAX} caracteres`,
      );
    }

    let idTecnico = body.idTecnico;
    if (idTecnico === '') {
      idTecnico = null;
    }

    let tecnicoSelecionado: Awaited<
      ReturnType<IUsuarioReadPort['findByIdInUnidade']>
    > | null = null;

    if (idTecnico !== undefined && idTecnico !== null) {
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

    const dataPrazoVencimento = parseOptionalOrdemServicoDate(
      body.dataPrazoVencimento,
      'dataPrazoVencimento',
    );
    const dataLimiteAtraso = parseOptionalOrdemServicoDate(
      body.dataLimiteAtraso,
      'dataLimiteAtraso',
    );
    if (
      dataPrazoVencimento &&
      dataLimiteAtraso &&
      dataLimiteAtraso.getTime() < dataPrazoVencimento.getTime()
    ) {
      throw new BadRequestException(
        'dataLimiteAtraso não pode ser anterior a dataPrazoVencimento',
      );
    }

    if (
      descricao === undefined &&
      idTecnico === undefined &&
      dataPrazoVencimento === undefined &&
      dataLimiteAtraso === undefined
    ) {
      throw new BadRequestException(
        'Informe ao menos um campo para atualização',
      );
    }

    const atual = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      unidade.empresaId,
      idUnidade,
    );
    if (!atual) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    const perfil = executorPerfil.toUpperCase();
    const podeEditarConcluida = perfil === 'GESTOR' || perfil === 'ADMIN';

    const mudouTecnico =
      idTecnico !== undefined &&
      (atual.idTecnico ?? null) !== (idTecnico ?? null);

    if (atual.status === 'CONCLUIDA') {
      if (!podeEditarConcluida) {
        throw new BadRequestException(
          'OS concluída só pode ser alterada por Gestor ou Admin (RN-15)',
        );
      }
      if (idTecnico !== undefined) {
        throw new BadRequestException(
          'Transferência de técnico não permitida em OS concluída (RN-15)',
        );
      }
    } else if (atual.status === 'CANCELADA') {
      throw new BadRequestException('OS cancelada não pode ser alterada.');
    } else if (mudouTecnico) {
      if (!['ABERTA', 'AGUARDANDO', 'EM_EXECUCAO'].includes(atual.status)) {
        throw new BadRequestException(
          'Transferência de OS permitida apenas para OS aberta, aguardando ou em andamento.',
        );
      }
    } else if (
      descricao !== undefined ||
      idTecnico !== undefined ||
      dataPrazoVencimento !== undefined ||
      dataLimiteAtraso !== undefined
    ) {
      if (!['ABERTA', 'AGUARDANDO'].includes(atual.status)) {
        throw new BadRequestException(
          'Somente OS aberta ou aguardando pode ser editada antes de iniciar execução.',
        );
      }
    }
    const motivoTransferencia = body.motivoTransferencia?.trim();
    if (
      mudouTecnico &&
      (!motivoTransferencia || motivoTransferencia.length < 10)
    ) {
      throw new BadRequestException(
        'Transferência de OS exige motivo com no mínimo 10 caracteres.',
      );
    }

    const tecnicoAnteriorId = atual.idTecnico ?? null;
    let status: OrdemServicoListaItem['status'] | undefined;

    if (mudouTecnico) {
      if (idTecnico == null) {
        status = 'ABERTA';
      } else if (atual.status === 'EM_EXECUCAO') {
        status = 'EM_EXECUCAO';
      } else {
        status = await resolveStatusAtribuicaoTecnico(
          this.ordens,
          unidade.empresaId,
          idUnidade,
          idTecnico,
        );
      }
    }

    const atualizado = await this.ordens.updateDados({
      idOrdemServico,
      empresaId: unidade.empresaId,
      idUnidade,
      descricao,
      idTecnico,
      status,
      dataPrazoVencimento,
      dataLimiteAtraso,
      transferidoPorUsuarioId: mudouTecnico ? executorUsuarioId : undefined,
      motivoTransferencia: mudouTecnico ? motivoTransferencia : undefined,
    });

    if (!atualizado) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    if (mudouTecnico && atualizado.idTecnico) {
      const tecnicoDestino =
        tecnicoSelecionado ??
        (await this.usuarios.findByIdInUnidade(
          atualizado.idTecnico,
          idUnidade,
        ));
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

    publishOrdemServicoStatus(this.notificacoes, idUnidade, atualizado);

    if (mudouTecnico && tecnicoAnteriorId && atual.status === 'EM_EXECUCAO') {
      await promoverFilaTecnicoAposLiberarSlot({
        ordens: this.ordens,
        notificacoes: this.notificacoes,
        empresaId: unidade.empresaId,
        idUnidade,
        idTecnico: tecnicoAnteriorId,
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
    const { tecnico, ordem, unidadeNome } = input;
    if (!tecnico?.email || !canDeliverEmail(this.emailPort, this.eventPublisher)) {
      return;
    }

    const osLink = resolveOrdemServicoEmailLink({
      frontendNgrokBaseUrl: this.config.get<string>(
        'FRONTEND_NGROK_PUBLIC_BASE_URL',
      ),
      frontendPublicBaseUrl: this.config.get<string>(
        'FRONTEND_PUBLIC_BASE_URL',
      ),
      ordemId: ordem.id,
    });

    const frontendBaseUrl = resolveFrontendBaseUrl({
      frontendNgrokBaseUrl: this.config.get<string>(
        'FRONTEND_NGROK_PUBLIC_BASE_URL',
      ),
      frontendPublicBaseUrl: this.config.get<string>(
        'FRONTEND_PUBLIC_BASE_URL',
      ),
    });
    const { subject, text, html } = buildOrdemServicoAtribuidaEmail({
      frontendBaseUrl,
      tecnicoNome: tecnico.nome,
      ordemId: ordem.id,
      ativoNome: ordem.ativoNome,
      tipo: ordem.tipo,
      status: ordem.status,
      unidadeNome,
      osLink,
      reassigned: true,
    });

    await deliverTransactionalEmail({
      emailPort: this.emailPort,
      eventPublisher: this.eventPublisher,
      payload: { to: tecnico.email, subject, text, html },
    });
  }
}
