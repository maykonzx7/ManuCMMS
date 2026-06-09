import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CategoriaOrdemServicoAnexoCodigo,
  OrdemServicoAnexoItem,
} from '../../domain/entities/ordem-servico';
import {
  ORDEM_SERVICO_ANEXO_REPOSITORY_PORT,
  type IOrdemServicoAnexoRepositoryPort,
} from '../../domain/ports/ordem-servico-anexo.repository.port';
import {
  ORDEM_SERVICO_REPOSITORY_PORT,
  type IOrdemServicoRepositoryPort,
} from '../../domain/ports/ordem-servico.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import { ManagedUploadService } from '../../infrastructure/storage/managed-upload.service';

const CATEGORIAS_VALIDAS: CategoriaOrdemServicoAnexoCodigo[] = [
  'PROBLEMA',
  'RESOLUCAO',
  'GERAL',
];

@Injectable()
export class ListOrdemServicoAnexosUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_ANEXO_REPOSITORY_PORT)
    private readonly anexos: IOrdemServicoAnexoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
  ): Promise<OrdemServicoAnexoItem[]> {
    const empresaId = await this.resolveEmpresaId(idUnidade);
    const ordem = await this.ordens.findByIdInUnidade(
      idOrdemServico,
      empresaId,
      idUnidade,
    );
    if (!ordem) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    return this.anexos.listByOrdemServico(
      empresaId,
      idUnidade,
      idOrdemServico,
    );
  }

  private async resolveEmpresaId(idUnidade: string): Promise<string> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }
    return unidade.empresaId;
  }
}

@Injectable()
export class CreateOrdemServicoAnexoUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_ANEXO_REPOSITORY_PORT)
    private readonly anexos: IOrdemServicoAnexoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(ORDEM_SERVICO_REPOSITORY_PORT)
    private readonly ordens: IOrdemServicoRepositoryPort,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    input: {
      categoria: string;
      nome: string;
      url: string;
      mimeType: string;
      tamanhoBytes: number;
    },
    uploadedPorUsuarioId: string,
  ): Promise<OrdemServicoAnexoItem> {
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

    const categoria = input.categoria
      ?.trim()
      .toUpperCase() as CategoriaOrdemServicoAnexoCodigo;
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
      throw new BadRequestException(
        'categoria deve ser PROBLEMA, RESOLUCAO ou GERAL',
      );
    }

    const nome = input.nome?.trim() ?? '';
    if (nome.length === 0 || nome.length > 200) {
      throw new BadRequestException('nome é obrigatório (até 200 caracteres)');
    }

    return this.anexos.create({
      empresaId: unidade.empresaId,
      ordemServicoId: idOrdemServico,
      categoria,
      nome,
      url: input.url,
      mimeType: input.mimeType,
      tamanhoBytes: input.tamanhoBytes,
      uploadedPorUsuarioId,
    });
  }
}

@Injectable()
export class DeleteOrdemServicoAnexoUseCase {
  constructor(
    @Inject(ORDEM_SERVICO_ANEXO_REPOSITORY_PORT)
    private readonly anexos: IOrdemServicoAnexoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    private readonly managedUpload: ManagedUploadService,
  ) {}

  async execute(
    idUnidade: string,
    idOrdemServico: string,
    idAnexo: string,
  ): Promise<void> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const anexos = await this.anexos.listByOrdemServico(
      unidade.empresaId,
      idUnidade,
      idOrdemServico,
    );
    const anexo = anexos.find((item) => item.id === idAnexo);
    if (!anexo) {
      throw new NotFoundException('Anexo não encontrado');
    }

    const deleted = await this.anexos.deleteById(
      unidade.empresaId,
      idUnidade,
      idOrdemServico,
      idAnexo,
    );
    if (!deleted) {
      throw new NotFoundException('Anexo não encontrado');
    }

    await this.managedUpload.deleteIfStored(anexo.url);
  }
}
