import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
  type IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';
import {
  USUARIO_READ_PORT,
  type IUsuarioReadPort,
} from '../../domain/ports/usuario-read.port';
import { EMAIL_PORT, type IEmailPort } from '../../domain/ports/email.port';
import { NotificacaoService } from '../notificacoes/notificacao.service';
import { resolveFrontendBaseUrl } from '../shared/frontend-link.shared';

@Injectable()
export class OrdemServicoSlaMonitorService {
  constructor(
    private readonly config: ConfigService,
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
    @Inject(EMAIL_PORT)
    private readonly emailPort: IEmailPort,
    private readonly notificacoes: NotificacaoService,
  ) {}

  async processarAtrasos(empresaId: string, unidadeId: string): Promise<void> {
    const atrasadas = await this.ordens.markOverdueAndCollect(
      empresaId,
      unidadeId,
    );
    if (atrasadas.length === 0) return;

    const users = await this.usuarios.listByUnidade(unidadeId);
    const gestores = users.filter(
      (u) => u.perfil === 'ADMIN' || u.perfil === 'SUPERVISOR',
    );
    const markedIds: string[] = [];

    for (const ordem of atrasadas) {
      const tecnico = ordem.idTecnico
        ? (users.find((u) => u.id === ordem.idTecnico) ?? null)
        : null;
      const recipients = [...gestores, ...(tecnico ? [tecnico] : [])];
      const dedup = new Map(recipients.map((u) => [u.id, u]));
      const osCode = ordem.id.slice(0, 8).toUpperCase();
      const msg = `A OS ${osCode} ultrapassou o SLA e está atrasada. Ativo: ${ordem.ativoNome}.`;

      for (const user of dedup.values()) {
        await this.notificacoes.create({
          usuarioId: user.id,
          empresaId,
          idUnidade: unidadeId,
          ordemServicoId: ordem.id,
          tipo: 'warning',
          titulo: 'OS atrasada (SLA)',
          mensagem: msg,
          linkPath: `/workspace/ordens/${ordem.id}`,
        });
        await this.enviarEmailAtraso(
          user.email,
          user.nome,
          ordem.id,
          ordem.ativoNome,
          ordem.idTecnico === user.id,
        );
      }

      markedIds.push(ordem.id);
    }

    await this.ordens.markSlaNotified(markedIds);
  }

  private async enviarEmailAtraso(
    email: string,
    nome: string,
    ordemId: string,
    ativoNome: string,
    isTecnico: boolean,
  ): Promise<void> {
    if (!email || !this.emailPort.isConfigured()) return;

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
      redirect: `/workspace/ordens/${ordemId}`,
    }).toString();
    const link = frontendBaseUrl
      ? `${frontendBaseUrl}${accessPath}?${query}`
      : null;

    const subject = `SLA atrasado na OS ${ordemId.slice(0, 8).toUpperCase()}`;
    const perfilTexto = isTecnico ? 'responsável técnico' : 'admin responsável';
    const text = [
      `Olá, ${nome}.`,
      '',
      `A OS ${ordemId} do ativo ${ativoNome} ultrapassou o SLA e foi marcada como atrasada.`,
      `Você foi notificado por ser ${perfilTexto}.`,
      link ? `Acesse: ${link}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.emailPort.send({
      to: email,
      subject,
      text,
      html: `<p>Olá, <strong>${nome}</strong>.</p><p>A OS <strong>${ordemId}</strong> do ativo <strong>${ativoNome}</strong> ultrapassou o SLA e foi marcada como atrasada.</p>${link ? `<p><a href="${link}">Abrir OS no sistema</a></p>` : ''}`,
    });
  }
}
