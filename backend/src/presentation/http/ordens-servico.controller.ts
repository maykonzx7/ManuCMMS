import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { EscalarOrdemServicoUseCase } from '../../application/ordens-servico/escalar-ordem-servico.use-case';
import { UpdateOrdemServicoUseCase } from '../../application/ordens-servico/update-ordem-servico.use-case';
import type { OrdemServicoListaItem } from '../../domain/entities/ordem-servico';
import type { ListOrdensServicoFilters } from '../../domain/ports/ordem-servico.repository.port';

type CreateOrdemServicoBody = {
  idAtivo: string;
  tipo: string;
  descricao: string;
  prioridade?: string;
  idTecnico?: string | null;
};

type FecharOrdemServicoBody = {
  fotoAnexo?: string | null;
  fotoProblema?: string | null;
  descricaoProblema?: string | null;
  fotoSolucao?: string | null;
  descricaoSolucao?: string | null;
  assinaturaImagemDataUrl?: string | null;
  assinaturaNome?: string | null;
  pecasConsumidas?: string | null;
};

type IniciarOrdemServicoBody = {
  fotoProblema?: string | null;
  descricaoProblema?: string | null;
};

type UpdateOrdemServicoBody = {
  descricao?: string;
  idTecnico?: string | null;
  motivoTransferencia?: string;
};

type CancelarOrdemServicoBody = {
  observacaoCancelamento?: string | null;
};

type EscalarOrdemServicoBody = {
  motivo: string;
  statusAtivoSugerido?: 'MANUTENCAO' | 'FALHA' | null;
};

type FecharOrdemServicoFiles = {
  fotoAnexo?: Express.Multer.File[];
  fotoProblema?: Express.Multer.File[];
  fotoSolucao?: Express.Multer.File[];
};

type IniciarOrdemServicoFiles = {
  fotoProblema?: Express.Multer.File[];
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

function resolveRequestIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim().length > 0) {
    return xff.split(',')[0]!.trim();
  }
  if (Array.isArray(xff) && xff[0]) {
    return xff[0];
  }
  return req.ip ?? null;
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
    private readonly escalarOrdem: EscalarOrdemServicoUseCase,
  ) {}

  @Get()
  async list(
    @Req() req: Request,
    @Param('unidadeId') unidadeId: string,
    @Query('status') status?: string,
    @Query('tipo') tipo?: string,
    @Query('prioridade') prioridade?: string,
    @Query('idTecnico') idTecnico?: string,
    @Query('idAtivo') idAtivo?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.authorizePermission.execute(
      req.usuarioLocal,
      'os.visualizar_unidade',
    );
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    const filters = parseListFilters({
      status,
      tipo,
      prioridade,
      idTecnico,
      idAtivo,
      from,
      to,
    });
    const ordens = await this.listOrdens.execute(unidadeId, filters);
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
    return this.createOrdem.execute(unidadeId, body, req.usuarioLocal!.id);
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
    return this.updateOrdem.execute(
      unidadeId,
      ordemServicoId,
      body,
      req.usuarioLocal!.id,
      req.usuarioLocal!.perfil,
    );
  }

  @Patch(':ordemServicoId/iniciar')
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'fotoProblema', maxCount: 1 }],
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
  async iniciar(
    @Param('unidadeId') unidadeId: string,
    @Param('ordemServicoId') ordemServicoId: string,
    @Body() body: IniciarOrdemServicoBody = {},
    @UploadedFiles() files: IniciarOrdemServicoFiles = {},
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.executar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    const ordem = await this.getOrdemById.execute(unidadeId, ordemServicoId);
    this.assertTecnicoCanAccessOrdem(req, ordem);
    return this.iniciarExecucao.execute(
      unidadeId,
      ordemServicoId,
      req.usuarioLocal!.id,
      {
        fotoProblema: files.fotoProblema?.[0]
          ? fileToPublicUrl(req, files.fotoProblema[0])
          : body.fotoProblema,
        descricaoProblema: body.descricaoProblema,
      },
    );
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
    return this.cancelarOrdem.execute(
      unidadeId,
      ordemServicoId,
      body,
      req.usuarioLocal!.id,
    );
  }

  @Patch(':ordemServicoId/escalar')
  async escalar(
    @Param('unidadeId') unidadeId: string,
    @Param('ordemServicoId') ordemServicoId: string,
    @Body() body: EscalarOrdemServicoBody,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'os.executar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    const ordem = await this.getOrdemById.execute(unidadeId, ordemServicoId);
    this.assertTecnicoCanAccessOrdem(req, ordem);
    return this.escalarOrdem.execute(
      unidadeId,
      ordemServicoId,
      body,
      req.usuarioLocal!.id,
    );
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
    const assinaturaPayload =
      body.assinaturaImagemDataUrl?.trim()
        ? JSON.stringify({
            tipo: 'canvas',
            dataUrl: body.assinaturaImagemDataUrl.trim(),
            nomeAssinante: body.assinaturaNome?.trim() || req.usuarioLocal?.nome || null,
            usuarioId: req.usuarioLocal?.id ?? null,
            usuarioNome: req.usuarioLocal?.nome ?? null,
            ip: resolveRequestIp(req),
            userAgent: req.get('user-agent') ?? null,
            dataHora: new Date().toISOString(),
          })
        : null;

    return this.fecharOrdem.execute(unidadeId, ordemServicoId, {
      fotoAnexo: files.fotoAnexo?.[0]
        ? fileToPublicUrl(req, files.fotoAnexo[0])
        : body.fotoAnexo,
      fotoProblema: files.fotoProblema?.[0]
        ? fileToPublicUrl(req, files.fotoProblema[0])
        : body.fotoProblema,
      descricaoProblema: body.descricaoProblema,
      fotoSolucao: files.fotoSolucao?.[0]
        ? fileToPublicUrl(req, files.fotoSolucao[0])
        : body.fotoSolucao,
      descricaoSolucao: body.descricaoSolucao,
      assinaturaDigital: assinaturaPayload,
      pecasConsumidas: parsePecasConsumidas(body.pecasConsumidas),
    }, req.usuarioLocal!.id);
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

function parseListFilters(input: {
  status?: string;
  tipo?: string;
  prioridade?: string;
  idTecnico?: string;
  idAtivo?: string;
  from?: string;
  to?: string;
}): ListOrdensServicoFilters | undefined {
  const filters: ListOrdensServicoFilters = {};

  if (input.status?.trim()) {
    filters.status = input.status.trim().toUpperCase() as ListOrdensServicoFilters['status'];
  }
  if (input.tipo?.trim()) {
    filters.tipo = input.tipo.trim().toUpperCase() as ListOrdensServicoFilters['tipo'];
  }
  if (input.prioridade?.trim()) {
    filters.prioridade = input.prioridade.trim().toUpperCase() as ListOrdensServicoFilters['prioridade'];
  }
  if (input.idTecnico?.trim()) {
    filters.idTecnico = input.idTecnico.trim();
  }
  if (input.idAtivo?.trim()) {
    filters.idAtivo = input.idAtivo.trim();
  }
  if (input.from?.trim()) {
    const fromDate = new Date(input.from);
    if (Number.isNaN(fromDate.getTime())) {
      throw new BadRequestException('from inválido');
    }
    filters.from = fromDate;
  }
  if (input.to?.trim()) {
    const toDate = new Date(input.to);
    if (Number.isNaN(toDate.getTime())) {
      throw new BadRequestException('to inválido');
    }
    filters.to = toDate;
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
}

function parsePecasConsumidas(
  raw?: string | null,
): Array<{ pecaId: string; quantidade: number }> | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestException('pecasConsumidas deve ser JSON válido');
  }
  if (!Array.isArray(parsed)) {
    throw new BadRequestException('pecasConsumidas deve ser um array JSON');
  }
  return parsed.map((item) => {
    if (
      typeof item !== 'object' ||
      item == null ||
      typeof (item as { pecaId?: unknown }).pecaId !== 'string' ||
      typeof (item as { quantidade?: unknown }).quantidade !== 'number'
    ) {
      throw new BadRequestException(
        'Cada item de pecasConsumidas exige pecaId (string) e quantidade (number)',
      );
    }
    return {
      pecaId: (item as { pecaId: string }).pecaId,
      quantidade: (item as { quantidade: number }).quantidade,
    };
  });
}
