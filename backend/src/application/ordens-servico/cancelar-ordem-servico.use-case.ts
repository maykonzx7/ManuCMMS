import {
  BadRequestException,
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
export class CancelarOrdemServicoUseCase {
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
    input: { observacaoCancelamento?: string | null },
    canceladoPorUsuarioId: string,
  ): Promise<OrdemServicoListaItem> {
    const unidadeOk = await this.unidades.findById(idUnidade);
    if (!unidadeOk) {
      throw new NotFoundException('Unidade fabril não encontrada');
    }
    if (!unidadeOk.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const atual = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      unidadeOk.empresaId,
      idUnidade,
    );
    if (!atual) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    if (atual.status !== 'ABERTA') {
      throw new BadRequestException(
        'Cancelamento permitido somente para OS ABERTA.',
      );
    }

    const observacaoCancelamento = input.observacaoCancelamento?.trim() ?? '';
    if (observacaoCancelamento.length < 20) {
      throw new BadRequestException(
        'Informe uma observação de cancelamento com no mínimo 20 caracteres.',
      );
    }
    if (observacaoCancelamento.length > 1000) {
      throw new BadRequestException(
        'Observação de cancelamento deve ter no máximo 1000 caracteres.',
      );
    }

    const cancelada = await this.ordens.cancelar({
      idOrdemServico,
      empresaId: unidadeOk.empresaId,
      idUnidade,
      observacaoCancelamento,
      canceladoPorUsuarioId,
    });
    publishOrdemServicoStatus(this.notificacoes, idUnidade, cancelada);
    return cancelada;
  }
}
