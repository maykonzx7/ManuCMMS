import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import { EMAIL_PORT, type IEmailPort } from '../../domain/ports/email.port';
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
import { EventPublisherService } from '../../infrastructure/messaging/event-publisher.service';
import { NotificacaoService } from '../notificacoes/notificacao.service';
import { publishOrdemServicoStatus } from '../shared/ordem-servico-realtime.shared';
import {
  AUDIT_LOG_PORT,
  type IAuditLogPort,
} from '../../domain/ports/audit-log.port';
import { buildOrdemServicoEscaladaEmail } from '../shared/email/email-template.shared';
import {
  canDeliverEmail,
  deliverTransactionalEmail,
} from '../shared/email/deliver-email.shared';
import {
  resolveOsEmailContext,
  resolveOsLink,
} from '../shared/email/os-email-dispatch.shared';

const MOTIVO_MAX = 2000;

@Injectable()
export class EscalarOrdemServicoUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
    private readonly notificacoes: NotificacaoService,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLog: IAuditLogPort,
    @Inject(EMAIL_PORT)
    private readonly emailPort: IEmailPort,
    private readonly eventPublisher: EventPublisherService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    body: {
      motivo: string;
      statusAtivoSugerido?: 'MANUTENCAO' | 'FALHA' | null;
    },
    solicitanteUsuarioId: string,
  ): Promise<OrdemServicoListaItem> {
    const motivo = (body.motivo ?? '').trim();
    if (!motivo || motivo.length > MOTIVO_MAX) {
      throw new BadRequestException(
        `motivo é obrigatório e deve ter até ${MOTIVO_MAX} caracteres`,
      );
    }

    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const ordem = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      unidade.empresaId,
      idUnidade,
    );
    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    if (ordem.status === 'CONCLUIDA' || ordem.status === 'CANCELADA') {
      throw new BadRequestException('Não é possível escalar uma OS encerrada.');
    }

    const usuarios = await this.usuarios.listByUnidade(idUnidade);
    const superiores = usuarios.filter(
      (u) =>
        u.perfil === 'SUPERVISOR' ||
        u.perfil === 'GESTOR' ||
        u.perfil === 'ADMIN',
    );
    const solicitante = usuarios.find((u) => u.id === solicitanteUsuarioId);
    const nomeSolicitante = solicitante?.nome ?? 'Técnico';
    const osCurta = ordem.id.slice(0, 8).toUpperCase();
    const sugestao = body.statusAtivoSugerido
      ? ` Sugestão de status do ativo: ${body.statusAtivoSugerido}.`
      : '';
    const mensagem =
      `Escalonamento da OS ${osCurta} (${ordem.ativoNome}). ${nomeSolicitante} informou que não conseguiu concluir a intervenção.` +
      ` Motivo: ${motivo}.${sugestao}`;

    const { frontendBaseUrl } = resolveOsEmailContext(this.config);
    const osLink = resolveOsLink(this.config, ordem.id);

    for (const user of superiores) {
      await this.notificacoes.create({
        usuarioId: user.id,
        empresaId: unidade.empresaId,
        idUnidade,
        ordemServicoId: ordem.id,
        tipo: 'warning',
        titulo: 'OS escalada para análise',
        mensagem,
        linkPath: `/workspace/ordens/${ordem.id}`,
      });

      if (
        user.email?.trim() &&
        canDeliverEmail(this.emailPort, this.eventPublisher)
      ) {
        const { subject, text, html } = buildOrdemServicoEscaladaEmail({
          frontendBaseUrl,
          destinatarioNome: user.nome,
          solicitanteNome: nomeSolicitante,
          ordemId: ordem.id,
          ativoNome: ordem.ativoNome,
          unidadeNome: unidade.nome,
          motivo,
          osLink,
        });
        await deliverTransactionalEmail({
          emailPort: this.emailPort,
          eventPublisher: this.eventPublisher,
          payload: { to: user.email, subject, text, html },
        });
      }
    }

    await this.notificacoes.create({
      usuarioId: solicitanteUsuarioId,
      empresaId: unidade.empresaId,
      idUnidade,
      ordemServicoId: ordem.id,
      tipo: 'info',
      titulo: 'Escalonamento enviado',
      mensagem: `Seu escalonamento da OS ${osCurta} foi enviado para supervisão.`,
      linkPath: `/workspace/ordens/${ordem.id}`,
    });

    await this.auditLog.append({
      idUsuario: solicitanteUsuarioId,
      entidadeAfetada: 'OrdemServicoEscalonamento',
      idRegistro: `${ordem.id}:${Date.now()}`,
      valorAnterior: {},
      valorNovo: {
        acao: 'CREATE',
        ordemServicoId: ordem.id,
        idUnidade,
        solicitanteUsuarioId,
        motivo,
        statusAtivoSugerido: body.statusAtivoSugerido ?? null,
      },
    });

    publishOrdemServicoStatus(this.notificacoes, idUnidade, ordem);
    return ordem;
  }
}
