import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AtivoDocumentoItem,
  TipoAtivoDocumentoCodigo,
} from '../../domain/entities/ativo';
import {
  ATIVO_DOCUMENTO_REPOSITORY_PORT,
  type IAtivoDocumentoRepositoryPort,
} from '../../domain/ports/ativo-documento.repository.port';
import {
  ATIVO_REPOSITORY_PORT,
  type IAtivoRepositoryPort,
} from '../../domain/ports/ativo.repository.port';
import {
  UNIDADE_READ_PORT,
  type IUnidadeReadPort,
} from '../../domain/ports/unidade-read.port';
import { ManagedUploadService } from '../../infrastructure/storage/managed-upload.service';

const TIPOS_VALIDOS: TipoAtivoDocumentoCodigo[] = [
  'MANUAL',
  'DIAGRAMA',
  'DOCUMENTACAO',
];

@Injectable()
export class ListAtivoDocumentosUseCase {
  constructor(
    @Inject(ATIVO_DOCUMENTO_REPOSITORY_PORT)
    private readonly documentos: IAtivoDocumentoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
  ) {}

  async execute(
    idUnidade: string,
    idAtivo: string,
  ): Promise<AtivoDocumentoItem[]> {
    const empresaId = await this.resolveEmpresaId(idUnidade);
    const exists = await this.ativos.existsInUnidade(
      empresaId,
      idAtivo,
      idUnidade,
    );
    if (!exists) {
      throw new NotFoundException('Ativo não encontrado');
    }
    return this.documentos.listByAtivo(empresaId, idUnidade, idAtivo);
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
export class CreateAtivoDocumentoUseCase {
  constructor(
    @Inject(ATIVO_DOCUMENTO_REPOSITORY_PORT)
    private readonly documentos: IAtivoDocumentoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    @Inject(ATIVO_REPOSITORY_PORT)
    private readonly ativos: IAtivoRepositoryPort,
  ) {}

  async execute(
    idUnidade: string,
    idAtivo: string,
    input: {
      tipo: string;
      nome: string;
      url: string;
      mimeType: string;
      tamanhoBytes: number;
    },
    uploadedPorUsuarioId: string,
  ): Promise<AtivoDocumentoItem> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const exists = await this.ativos.existsInUnidade(
      unidade.empresaId,
      idAtivo,
      idUnidade,
    );
    if (!exists) {
      throw new NotFoundException('Ativo não encontrado');
    }

    const tipo = input.tipo?.trim().toUpperCase() as TipoAtivoDocumentoCodigo;
    if (!TIPOS_VALIDOS.includes(tipo)) {
      throw new BadRequestException(
        'tipo deve ser MANUAL, DIAGRAMA ou DOCUMENTACAO',
      );
    }

    const nome = input.nome?.trim() ?? '';
    if (nome.length === 0 || nome.length > 200) {
      throw new BadRequestException('nome é obrigatório (até 200 caracteres)');
    }

    return this.documentos.create({
      empresaId: unidade.empresaId,
      ativoId: idAtivo,
      tipo,
      nome,
      url: input.url,
      mimeType: input.mimeType,
      tamanhoBytes: input.tamanhoBytes,
      uploadedPorUsuarioId,
    });
  }
}

@Injectable()
export class DeleteAtivoDocumentoUseCase {
  constructor(
    @Inject(ATIVO_DOCUMENTO_REPOSITORY_PORT)
    private readonly documentos: IAtivoDocumentoRepositoryPort,
    @Inject(UNIDADE_READ_PORT)
    private readonly unidades: IUnidadeReadPort,
    private readonly managedUpload: ManagedUploadService,
  ) {}

  async execute(
    idUnidade: string,
    idAtivo: string,
    idDocumento: string,
  ): Promise<void> {
    const unidade = await this.unidades.findById(idUnidade);
    if (!unidade?.empresaId) {
      throw new NotFoundException('Empresa da unidade fabril não encontrada');
    }

    const documentos = await this.documentos.listByAtivo(
      unidade.empresaId,
      idUnidade,
      idAtivo,
    );
    const documento = documentos.find((item) => item.id === idDocumento);
    if (!documento) {
      throw new NotFoundException('Documento não encontrado');
    }

    const deleted = await this.documentos.deleteById(
      unidade.empresaId,
      idUnidade,
      idAtivo,
      idDocumento,
    );
    if (!deleted) {
      throw new NotFoundException('Documento não encontrado');
    }

    await this.managedUpload.deleteIfStored(documento.url);
  }
}
