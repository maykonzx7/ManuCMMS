import { Inject, Injectable } from '@nestjs/common';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import {
  USUARIO_READ_PORT,
  type IUsuarioReadPort,
} from '../../domain/ports/usuario-read.port';
import type { OsPreditivaCriadaEvent } from '../../infrastructure/messaging/contracts';
import { NotificacaoService } from '../notificacoes/notificacao.service';
import { publishOrdemServicoStatus } from '../shared/ordem-servico-realtime.shared';

@Injectable()
export class HandleOsPreditivaCriadaUseCase {
  constructor(
    private readonly notificacoes: NotificacaoService,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(USUARIO_READ_PORT)
    private readonly usuarios: IUsuarioReadPort,
  ) {}

  async execute(event: OsPreditivaCriadaEvent): Promise<void> {
    const unidade = await this.unidades.findById(event.idUnidade);
    const unidadeNome = unidade?.nome ?? 'Unidade';
    const linkPath = `/workspace/ordens/${event.osId}`;

    let tecnico: Awaited<
      ReturnType<IUsuarioReadPort['findByIdInUnidade']>
    > | null = null;
    if (event.idTecnico) {
      tecnico = await this.usuarios.findByIdInUnidade(
        event.idTecnico,
        event.idUnidade,
      );
    }

    const origemLabel = event.origem === 'SIMULACAO' ? 'simulação' : 'IoT';
    const osRef = event.osId.slice(0, 8).toUpperCase();

    if (tecnico?.id) {
      await this.notificacoes.create({
        usuarioId: tecnico.id,
        empresaId: event.empresaId,
        idUnidade: event.idUnidade,
        ordemServicoId: event.osId,
        tipo: 'info',
        titulo: 'Nova OS preditiva atribuida a voce',
        mensagem: `OS ${osRef} gerada por ${origemLabel} (RN-01) no ativo ${event.ativoNome}. Unidade: ${unidadeNome}.`,
        linkPath,
      });
    }

    const usuarios = await this.usuarios.listByUnidade(event.idUnidade);
    const admins = usuarios.filter((u) => u.perfil === 'ADMIN');
    for (const admin of admins) {
      await this.notificacoes.create({
        usuarioId: admin.id,
        empresaId: event.empresaId,
        idUnidade: event.idUnidade,
        ordemServicoId: event.osId,
        tipo: 'warning',
        titulo: 'OS preditiva criada automaticamente',
        mensagem: `RN-01 (${origemLabel}): OS ${osRef} aberta no ativo ${event.ativoNome}${
          tecnico?.nome ? ` e atribuida ao tecnico ${tecnico.nome}` : ''
        }.`,
        linkPath,
      });
    }

    publishOrdemServicoStatus(this.notificacoes, event.idUnidade, {
      id: event.osId,
      status: event.status,
      tipo: 'PREDITIVA',
      prioridade: 'ALTA',
      idAtivo: event.ativoId,
      idTecnico: event.idTecnico,
    });
  }
}
