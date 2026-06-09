import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
  type IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import { NotificacaoService } from '../notificacoes/notificacao.service';
import { publishOrdemServicoStatus } from '../shared/ordem-servico-realtime.shared';

@Injectable()
export class IniciarExecucaoOrdemServicoUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    private readonly notificacoes: NotificacaoService,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    iniciadoPorUsuarioId: string,
    body?: { fotoProblema?: string | null; descricaoProblema?: string | null },
  ): Promise<OrdemServicoListaItem> {
    const unidadeOk = await this.unidades.findById(idUnidade);
    if (!unidadeOk) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }
    if (!unidadeOk.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }
    const ordem = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      unidadeOk.empresaId,
      idUnidade,
    );
    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    if (ordem.status === 'AGUARDANDO') {
      throw new BadRequestException(
        'OS aguardando na fila do técnico — conclua a OS em execução ou aguarde liberação automática.',
      );
    }
    if (ordem.status !== 'ABERTA') {
      throw new BadRequestException(
        'Somente OS ABERTA pode ser iniciada para execução.',
      );
    }
    if (ordem.idTecnico) {
      const ocupado = await this.ordens.tecnicoTemOsEmExecucao(
        unidadeOk.empresaId,
        idUnidade,
        ordem.idTecnico,
        idOrdemServico,
      );
      if (ocupado) {
        throw new ConflictException(
          'Técnico já possui outra OS em execução — finalize-a antes de iniciar uma nova.',
        );
      }
    }
    const fotoProblema = body?.fotoProblema?.trim() || null;
    const descricaoProblema = body?.descricaoProblema?.trim() || null;
    if (ordem.tipo === 'CORRETIVA' && !fotoProblema) {
      throw new BadRequestException(
        'Ao iniciar OS corretiva, anexe a foto do problema (RN-13).',
      );
    }
    if (ordem.tipo === 'CORRETIVA' && !descricaoProblema) {
      throw new BadRequestException(
        'Ao iniciar OS corretiva, descreva o problema no campo descricaoProblema.',
      );
    }

    const iniciada = await this.ordens.iniciarExecucao(
      idOrdemServico,
      unidadeOk.empresaId,
      idUnidade,
      iniciadoPorUsuarioId,
      fotoProblema,
      descricaoProblema,
    );
    await this.notificacoes.markOrdemServicoAsReadForUsuario(
      iniciadoPorUsuarioId,
      idOrdemServico,
    );
    publishOrdemServicoStatus(this.notificacoes, idUnidade, iniciada);
    return iniciada;
  }
}
