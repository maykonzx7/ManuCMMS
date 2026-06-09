import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UsuarioLocalContext } from '../../domain/entities/usuario-local';
import type {
  OrdemServicoComentarioItem,
  OrdemServicoListaItem,
} from '../../domain/entities/ordem-servico';
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
import { buildOrdemServicoComentarioEmail } from '../shared/email/email-template.shared';
import {
  canDeliverEmail,
  deliverTransactionalEmail,
} from '../shared/email/deliver-email.shared';
import {
  resolveOsEmailContext,
  resolveOsLink,
} from '../shared/email/os-email-dispatch.shared';

const PERFIS_SUPERVISAO = new Set(['SUPERVISOR', 'GESTOR', 'ADMIN']);

@Injectable()
export class CreateOrdemServicoComentarioUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
    @Inject(EMAIL_PORT)
    private readonly emailPort: IEmailPort,
    private readonly eventPublisher: EventPublisherService,
    private readonly config: ConfigService,
    private readonly notificacoes: NotificacaoService,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    idUsuario: string,
    texto: string,
  ): Promise<OrdemServicoComentarioItem> {
    const normalized = texto.trim();
    if (normalized.length < 2) {
      throw new BadRequestException(
        'Comentário deve ter ao menos 2 caracteres.',
      );
    }
    if (normalized.length > 2000) {
      throw new BadRequestException(
        'Comentário deve ter no máximo 2000 caracteres.',
      );
    }

    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const os = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      unidade.empresaId,
      idUnidade,
    );
    if (!os) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }

    const comentario = await this.ordens.createComentario({
      ordemServicoId: idOrdemServico,
      usuarioId: idUsuario,
      texto: normalized,
    });

    await this.notifyComentario({
      os,
      comentario,
      idUnidade,
      empresaId: unidade.empresaId,
      unidadeNome: unidade.nome,
      autorId: idUsuario,
      texto: normalized,
    });

    return comentario;
  }

  private async resolveDestinatarios(input: {
    os: OrdemServicoListaItem;
    idUnidade: string;
    autorId: string;
  }): Promise<UsuarioLocalContext[]> {
    const usuarios = await this.usuarios.listByUnidade(input.idUnidade);
    const map = new Map<string, UsuarioLocalContext>();

    if (input.os.idTecnico && input.os.idTecnico !== input.autorId) {
      const tecnico = usuarios.find((u) => u.id === input.os.idTecnico);
      if (tecnico) map.set(tecnico.id, tecnico);
    }

    if (
      input.os.idCriadoPorUsuario &&
      input.os.idCriadoPorUsuario !== input.autorId
    ) {
      const criador = usuarios.find((u) => u.id === input.os.idCriadoPorUsuario);
      if (criador) map.set(criador.id, criador);
    }

    for (const user of usuarios) {
      if (user.id === input.autorId) continue;
      if (PERFIS_SUPERVISAO.has(user.perfil)) {
        map.set(user.id, user);
      }
    }

    return [...map.values()];
  }

  private async notifyComentario(input: {
    os: OrdemServicoListaItem;
    comentario: OrdemServicoComentarioItem;
    idUnidade: string;
    empresaId: string;
    unidadeNome: string;
    autorId: string;
    texto: string;
  }): Promise<void> {
    const {
      os,
      comentario,
      idUnidade,
      empresaId,
      unidadeNome,
      autorId,
      texto,
    } = input;

    const destinatarios = await this.resolveDestinatarios({
      os,
      idUnidade,
      autorId,
    });
    if (destinatarios.length === 0) return;

    const osCurta = os.id.slice(0, 8).toUpperCase();
    const preview = texto.length > 120 ? `${texto.slice(0, 117)}...` : texto;

    for (const destinatario of destinatarios) {
      await this.notificacoes.create({
        usuarioId: destinatario.id,
        empresaId,
        idUnidade,
        ordemServicoId: os.id,
        tipo: 'info',
        titulo: 'Novo comentario na OS',
        mensagem: `${comentario.usuarioNome} comentou na OS ${osCurta} (${os.ativoNome}): "${preview}"`,
        linkPath: `/workspace/ordens/${os.id}`,
      });

      await this.sendComentarioEmail({
        destinatario,
        os,
        comentario,
        unidadeNome,
        texto: preview,
      });
    }
  }

  private async sendComentarioEmail(input: {
    destinatario: UsuarioLocalContext;
    os: OrdemServicoListaItem;
    comentario: OrdemServicoComentarioItem;
    unidadeNome: string;
    texto: string;
  }): Promise<void> {
    const { destinatario, os, comentario, unidadeNome, texto } = input;
    if (
      !destinatario.email?.trim() ||
      !canDeliverEmail(this.emailPort, this.eventPublisher)
    ) {
      return;
    }

    const { frontendBaseUrl } = resolveOsEmailContext(this.config);
    const osLink = resolveOsLink(this.config, os.id);
    const { subject, text, html } = buildOrdemServicoComentarioEmail({
      frontendBaseUrl,
      destinatarioNome: destinatario.nome,
      autorNome: comentario.usuarioNome,
      ordemId: os.id,
      ativoNome: os.ativoNome,
      unidadeNome,
      comentario: texto,
      osLink,
    });

    await deliverTransactionalEmail({
      emailPort: this.emailPort,
      eventPublisher: this.eventPublisher,
      payload: { to: destinatario.email, subject, text, html },
    });
  }
}
