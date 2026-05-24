import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { diskStorage } from 'multer';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { EnforceUnidadeScopeUseCase } from '../../application/iam/enforce-unidade-scope.use-case';
import { CancelarOrdemServicoUseCase } from '../../application/ordens-servico/cancelar-ordem-servico.use-case';
import { CreateOrdemServicoUseCase } from '../../application/ordens-servico/create-ordem-servico.use-case';
import { FecharOrdemServicoUseCase } from '../../application/ordens-servico/fechar-ordem-servico.use-case';
import { GetOrdemServicoByIdUseCase } from '../../application/ordens-servico/get-ordem-servico-by-id.use-case';
import { IniciarExecucaoOrdemServicoUseCase } from '../../application/ordens-servico/iniciar-execucao-ordem-servico.use-case';
import { ListOrdensServicoByUnidadeUseCase } from '../../application/ordens-servico/list-ordens-servico-by-unidade.use-case';
import { UpdateOrdemServicoUseCase } from '../../application/ordens-servico/update-ordem-servico.use-case';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';

type CreateOrdemServicoBody = {
  idAtivo: string;
  tipo: string;
  descricao: string;
  idTecnico?: string | null;
};

type FecharOrdemServicoBody = {
  fotoAnexo?: string | null;
  fotoProblema?: string | null;
  fotoSolucao?: string | null;
};

type UpdateOrdemServicoBody = {
  descricao?: string;
  idTecnico?: string | null;
};

type CancelarOrdemServicoBody = {
  observacaoCancelamento?: string | null;
};

type FecharOrdemServicoFiles = {
  fotoAnexo?: Express.Multer.File[];
  fotoProblema?: Express.Multer.File[];
  fotoSolucao?: Express.Multer.File[];
};

const UPLOADS_DIR = process.env.UPLOAD_DIR ?? 'uploads';
const fotoUploadDir = join(process.cwd(), UPLOADS_DIR, 'ordens-servico');
mkdirSync(fotoUploadDir, { recursive: true });
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

function isImagemMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function fileToPublicUrl(req: Request, file: Express.Multer.File): string {
  const baseUrl = process.env.PUBLIC_BASE_URL?.trim();
  const origin = baseUrl && baseUrl.length > 0 ? baseUrl : `${req.protocol}://${req.get('host')}`;
  return `${origin}/${UPLOADS_DIR}/ordens-servico/${file.filename}`;
}

/**
 * OS por unidade (RN-05, RN-10). Iniciar execução, cancelar, fechar (RN-02/13/14).
 * Auditoria Mongo em criar/fechar/cancelar/iniciar (RN-04). RN-08: JWT + unidade depois.
 */
@Controller('unidades/:unidadeId/ordens-servico')
export class OrdensServicoController {
  constructor(
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly enforceUnidadeScope: EnforceUnidadeScopeUseCase,
    private readonly listOrdens: ListOrdensServicoByUnidadeUseCase,
    private readonly getOrdemById: GetOrdemServicoByIdUseCase,
    private readonly createOrdem: CreateOrdemServicoUseCase,
    private readonly updateOrdem: UpdateOrdemServicoUseCase,
    private readonly fecharOrdem: FecharOrdemServicoUseCase,
    private readonly iniciarExecucao: IniciarExecucaoOrdemServicoUseCase,
    private readonly cancelarOrdem: CancelarOrdemServicoUseCase,
  ) {}

  @Get()
  async list(@Param('unidadeId') unidadeId: string, @Req() req: Request) {
    this.authorizePermission.execute(
      req.usuarioLocal,
      'os.visualizar_unidade',
    );
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    const ordens = await this.listOrdens.execute(unidadeId);
    return this.filterOrdensByTecnicoScope(req, ordens);
  }

  @Post()
  async create(
    @Param('unidadeId') unidadeId: string,
    @Body() body: CreateOrdemServicoBody,
    @Req() req: Request,
  ) {
    this.assertTecnicoCannotCreateOrEdit(req);
    this.authorizePermission.execute(req.usuarioLocal, 'os.criar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.createOrdem.execute(unidadeId, body);
  }

  @Get(':ordemServicoId')
  async getById(
    @Param('unidadeId') unidadeId: string,
    @Param('ordemServicoId') ordemServicoId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.visualizar_unidade');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    const ordem = await this.getOrdemById.execute(unidadeId, ordemServicoId);
    this.assertTecnicoCanAccessOrdem(req, ordem);
    return ordem;
  }

  @Patch(':ordemServicoId')
  async update(
    @Param('unidadeId') unidadeId: string,
    @Param('ordemServicoId') ordemServicoId: string,
    @Body() body: UpdateOrdemServicoBody,
    @Req() req: Request,
  ) {
    this.assertTecnicoCannotCreateOrEdit(req);
    this.authorizePermission.execute(req.usuarioLocal, 'os.criar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.updateOrdem.execute(unidadeId, ordemServicoId, body);
  }

  @Patch(':ordemServicoId/iniciar')
  async iniciar(
    @Param('unidadeId') unidadeId: string,
    @Param('ordemServicoId') ordemServicoId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.executar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    const ordem = await this.getOrdemById.execute(unidadeId, ordemServicoId);
    this.assertTecnicoCanAccessOrdem(req, ordem);
    return this.iniciarExecucao.execute(unidadeId, ordemServicoId);
  }

  @Patch(':ordemServicoId/cancelar')
  async cancelar(
    @Param('unidadeId') unidadeId: string,
    @Param('ordemServicoId') ordemServicoId: string,
    @Body() body: CancelarOrdemServicoBody,
    @Req() req: Request,
  ) {
    this.assertTecnicoCannotCreateOrEdit(req);
    this.authorizePermission.execute(req.usuarioLocal, 'os.cancelar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.cancelarOrdem.execute(unidadeId, ordemServicoId, body);
  }

  @Patch(':ordemServicoId/fechar')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'fotoAnexo', maxCount: 1 },
        { name: 'fotoProblema', maxCount: 1 },
        { name: 'fotoSolucao', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (_req, _file, cb) => cb(null, fotoUploadDir),
          filename: (_req, file, cb) =>
            cb(null, `${randomUUID()}${extname(file.originalname || '')}`),
        }),
        limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
        fileFilter: (_req, file, cb) => {
          if (!isImagemMimeType(file.mimetype)) {
            cb(new BadRequestException('Apenas arquivos de imagem são permitidos'), false);
            return;
          }
          cb(null, true);
        },
      },
    ),
  )
  async fechar(
    @Param('unidadeId') unidadeId: string,
    @Param('ordemServicoId') ordemServicoId: string,
    @Body() body: FecharOrdemServicoBody = {},
    @UploadedFiles() files: FecharOrdemServicoFiles = {},
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.fechar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    const ordem = await this.getOrdemById.execute(unidadeId, ordemServicoId);
    this.assertTecnicoCanAccessOrdem(req, ordem);
    return this.fecharOrdem.execute(unidadeId, ordemServicoId, {
      fotoAnexo: files.fotoAnexo?.[0]
        ? fileToPublicUrl(req, files.fotoAnexo[0])
        : body.fotoAnexo,
      fotoProblema: files.fotoProblema?.[0]
        ? fileToPublicUrl(req, files.fotoProblema[0])
        : body.fotoProblema,
      fotoSolucao: files.fotoSolucao?.[0]
        ? fileToPublicUrl(req, files.fotoSolucao[0])
        : body.fotoSolucao,
    });
  }

  private isTecnico(req: Request): boolean {
    return req.usuarioLocal?.perfil?.toUpperCase() === 'TECNICO';
  }

  private assertTecnicoCannotCreateOrEdit(req: Request): void {
    if (!this.isTecnico(req)) {
      return;
    }
    throw new ForbiddenException(
      'Perfil TECNICO nao pode criar, editar ou cancelar ordens de servico.',
    );
  }

  private filterOrdensByTecnicoScope(
    req: Request,
    ordens: OrdemServicoListaItem[],
  ): OrdemServicoListaItem[] {
    if (!this.isTecnico(req)) {
      return ordens;
    }
    const usuarioId = req.usuarioLocal?.id;
    return ordens.filter((ordem) => ordem.idTecnico === usuarioId);
  }

  private assertTecnicoCanAccessOrdem(
    req: Request,
    ordem: OrdemServicoListaItem,
  ): void {
    if (!this.isTecnico(req)) {
      return;
    }
    if (ordem.idTecnico === req.usuarioLocal?.id) {
      return;
    }
    throw new ForbiddenException(
      'Acesso negado: tecnico so pode operar ordens de servico atribuidas a ele.',
    );
  }
}
