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
import { buildSlaAtrasadoEmail } from '../shared/email/email-template.shared';
import { resolveFrontendBaseUrl } from '../shared/frontend-link.shared';
import { resolveOrdemServicoEmailLink } from '../shared/ordem-servico-link.shared';

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

    const link = resolveOrdemServicoEmailLink({
      frontendNgrokBaseUrl: this.config.get<string>(
        'FRONTEND_NGROK_PUBLIC_BASE_URL',
      ),
      frontendPublicBaseUrl: this.config.get<string>(
        'FRONTEND_PUBLIC_BASE_URL',
      ),
      ordemId,
    });

    const perfilTexto = isTecnico ? 'responsável técnico' : 'admin responsável';
    const frontendBaseUrl = resolveFrontendBaseUrl({
      frontendNgrokBaseUrl: this.config.get<string>(
        'FRONTEND_NGROK_PUBLIC_BASE_URL',
      ),
      frontendPublicBaseUrl: this.config.get<string>(
        'FRONTEND_PUBLIC_BASE_URL',
      ),
    });
    const { subject, text, html } = buildSlaAtrasadoEmail({
      frontendBaseUrl,
      nome,
      ordemId,
      ativoNome,
      perfilTexto,
      osLink: link,
    });

    await this.emailPort.send({
      to: email,
      subject,
      text,
      html,
    });
  }
}
