import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { NotificacaoService } from '../notificacoes/notificacao.service';
import { resolveFrontendBaseUrl } from '../shared/frontend-link.shared';

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
      throw new BadRequestException('Comentário deve ter ao menos 2 caracteres.');
    }
    if (normalized.length > 2000) {
      throw new BadRequestException('Comentário deve ter no máximo 2000 caracteres.');
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

    await this.notifyTecnicoComentario({
      os,
      comentario,
      idUnidade,
      empresaId: unidade.empresaId,
      unidadeNome: unidade.nome,
      empresaSlug: unidade.empresaSlug ?? null,
      autorId: idUsuario,
      texto: normalized,
    });

    return comentario;
  }

  private async notifyTecnicoComentario(input: {
    os: OrdemServicoListaItem;
    comentario: OrdemServicoComentarioItem;
    idUnidade: string;
    empresaId: string;
    unidadeNome: string;
    empresaSlug: string | null;
    autorId: string;
    texto: string;
  }): Promise<void> {
    const {
      os,
      comentario,
      idUnidade,
      empresaId,
      unidadeNome,
      empresaSlug,
      autorId,
      texto,
    } = input;
    if (!os.idTecnico || os.idTecnico === autorId) {
      return;
    }

    const osCurta = os.id.slice(0, 8).toUpperCase();
    const preview =
      texto.length > 120 ? `${texto.slice(0, 117)}...` : texto;

    await this.notificacoes.create({
      usuarioId: os.idTecnico,
      empresaId,
      idUnidade,
      ordemServicoId: os.id,
      tipo: 'info',
      titulo: 'Novo comentario na OS',
      mensagem: `${comentario.usuarioNome} comentou na OS ${osCurta} (${os.ativoNome}): "${preview}"`,
      linkPath: `/workspace/ordens/${os.id}`,
    });

    const tecnico = await this.usuarios.findByIdInUnidade(os.idTecnico, idUnidade);
    await this.sendTecnicoComentarioEmail({
      tecnico,
      os,
      comentario,
      unidadeNome,
      idUnidade,
      empresaSlug,
      texto: preview,
    });
  }

  private async sendTecnicoComentarioEmail(input: {
    tecnico: Awaited<ReturnType<IUsuarioReadPort['findByIdInUnidade']>> | null;
    os: OrdemServicoListaItem;
    comentario: OrdemServicoComentarioItem;
    unidadeNome: string;
    idUnidade: string;
    empresaSlug: string | null;
    texto: string;
  }): Promise<void> {
    const { tecnico, os, comentario, unidadeNome, idUnidade, empresaSlug, texto } =
      input;
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
      redirect: `/workspace/ordens/${os.id}`,
      osId: os.id,
      unidadeId: idUnidade,
    });
    const normalizedEmpresaSlug = empresaSlug?.trim().toLowerCase() ?? '';
    const accessPathWithScope = normalizedEmpresaSlug
      ? `${accessPath.replace(/\/+$/, '')}/${normalizedEmpresaSlug}`
      : accessPath;
    const osLink = frontendBaseUrl
      ? `${frontendBaseUrl}${accessPathWithScope}?${query.toString()}`
      : null;

    const osCurta = os.id.slice(0, 8).toUpperCase();
    const subject = `Novo comentario na OS ${osCurta}: ${os.ativoNome}`;
    const text = [
      `Olá, ${tecnico.nome}.`,
      '',
      `${comentario.usuarioNome} comentou na ordem de serviço atribuída a você.`,
      `OS: ${os.id}`,
      `Ativo: ${os.ativoNome}`,
      `Unidade: ${unidadeNome}`,
      `Comentário: ${texto}`,
      osLink ? `Acesse: ${osLink}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const html = `
      <p>Olá, <strong>${escapeHtml(tecnico.nome)}</strong>.</p>
      <p><strong>${escapeHtml(comentario.usuarioNome)}</strong> comentou na ordem de serviço atribuída a você.</p>
      <ul>
        <li><strong>OS:</strong> ${escapeHtml(os.id)}</li>
        <li><strong>Ativo:</strong> ${escapeHtml(os.ativoNome)}</li>
        <li><strong>Unidade:</strong> ${escapeHtml(unidadeNome)}</li>
      </ul>
      <p><strong>Comentário:</strong></p>
      <blockquote>${escapeHtml(texto)}</blockquote>
      ${osLink ? `<p><a href="${osLink}">Abrir OS agora</a></p>` : ''}
    `;

    try {
      await this.emailPort.send({ to: tecnico.email, subject, text, html });
    } catch {
      // Notificação por email é best-effort e não deve bloquear o comentário.
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
