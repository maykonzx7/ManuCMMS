import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PECA_REPOSITORY_PORT,
  type CreatePecaInput,
  type IPecaRepositoryPort,
  type PecaItem,
  type PecaMovimentacaoItem,
  type UpdatePecaInput,
} from '../../domain/ports/peca.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';

@Injectable()
export class ListPecasByUnidadeUseCase {
  constructor(
    @Inject(PECA_REPOSITORY_PORT)
    private readonly pecas: IPecaRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(idUnidade: string): Promise<PecaItem[]> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }
    return this.pecas.listByUnidade(unidade.empresaId, idUnidade);
  }
}

@Injectable()
export class CreatePecaUseCase {
  constructor(
    @Inject(PECA_REPOSITORY_PORT)
    private readonly pecas: IPecaRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(
    idUnidade: string,
    body: {
      codigo: string;
      nome: string;
      quantidadeEstoque?: number;
      quantidadeMinima?: number;
    },
  ): Promise<PecaItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const codigo = body.codigo?.trim();
    const nome = body.nome?.trim();
    if (!codigo || codigo.length > 80) {
      throw new BadRequestException('codigo é obrigatório (até 80 caracteres)');
    }
    if (!nome || nome.length > 150) {
      throw new BadRequestException('nome é obrigatório (até 150 caracteres)');
    }

    const input: CreatePecaInput = {
      empresaId: unidade.empresaId,
      idUnidade,
      codigo,
      nome,
      quantidadeEstoque: body.quantidadeEstoque,
      quantidadeMinima: body.quantidadeMinima,
    };

    return this.pecas.create(input);
  }
}

@Injectable()
export class UpdatePecaUseCase {
  constructor(
    @Inject(PECA_REPOSITORY_PORT)
    private readonly pecas: IPecaRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(
    idUnidade: string,
    pecaId: string,
    body: UpdatePecaInput,
  ): Promise<PecaItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }
    const existing = await this.pecas.findByIdInUnidade(
      pecaId,
      unidade.empresaId,
      idUnidade,
    );
    if (!existing) {
      throw new NotFoundException('Peça não encontrada');
    }
    if (body.codigo !== undefined) {
      const codigo = body.codigo.trim();
      if (!codigo || codigo.length > 80) {
        throw new BadRequestException('codigo inválido (até 80 caracteres)');
      }
    }
    if (body.nome !== undefined) {
      const nome = body.nome.trim();
      if (!nome || nome.length > 150) {
        throw new BadRequestException('nome inválido (até 150 caracteres)');
      }
    }
    return this.pecas.update(pecaId, unidade.empresaId, idUnidade, body);
  }
}

@Injectable()
export class DeletePecaUseCase {
  constructor(
    @Inject(PECA_REPOSITORY_PORT)
    private readonly pecas: IPecaRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(idUnidade: string, pecaId: string): Promise<void> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }
    const existing = await this.pecas.findByIdInUnidade(
      pecaId,
      unidade.empresaId,
      idUnidade,
    );
    if (!existing) {
      throw new NotFoundException('Peça não encontrada');
    }
    const consumos = await this.pecas.countConsumos(pecaId);
    if (consumos > 0) {
      throw new ConflictException(
        'Peça já utilizada em ordens de serviço; não pode ser excluída',
      );
    }
    await this.pecas.delete(pecaId, unidade.empresaId, idUnidade);
  }
}

@Injectable()
export class ListPecaMovimentacoesUseCase {
  constructor(
    @Inject(PECA_REPOSITORY_PORT)
    private readonly pecas: IPecaRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
  ) {}

  async execute(idUnidade: string): Promise<PecaMovimentacaoItem[]> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }
    return this.pecas.listMovimentacoes(unidade.empresaId, idUnidade);
  }
}
