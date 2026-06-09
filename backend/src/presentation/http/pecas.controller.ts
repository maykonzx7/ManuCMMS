import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  CreatePecaUseCase,
  DeletePecaUseCase,
  ListPecaMovimentacoesUseCase,
  ListPecasByUnidadeUseCase,
  UpdatePecaUseCase,
} from '../../application/pecas/pecas.use-cases';
import { ExportPecasEstoqueUseCase } from '../../application/pecas/export-pecas-estoque.use-case';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { EnforceUnidadeScopeUseCase } from '../../application/iam/enforce-unidade-scope.use-case';

type CreatePecaBody = {
  codigo: string;
  nome: string;
  quantidadeEstoque?: number;
  quantidadeMinima?: number;
};

type UpdatePecaBody = {
  codigo?: string;
  nome?: string;
  quantidadeEstoque?: number;
  quantidadeMinima?: number;
};

@Controller('unidades/:unidadeId/pecas')
export class PecasController {
  constructor(
    private readonly listPecas: ListPecasByUnidadeUseCase,
    private readonly listMovimentacoes: ListPecaMovimentacoesUseCase,
    private readonly createPeca: CreatePecaUseCase,
    private readonly updatePeca: UpdatePecaUseCase,
    private readonly deletePeca: DeletePecaUseCase,
    private readonly exportEstoque: ExportPecasEstoqueUseCase,
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly enforceUnidadeScope: EnforceUnidadeScopeUseCase,
  ) {}

  @Get()
  async list(@Param('unidadeId') unidadeId: string, @Req() req: Request) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.visualizar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.listPecas.execute(unidadeId);
  }

  @Get('movimentacoes')
  async movimentacoes(
    @Param('unidadeId') unidadeId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.visualizar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.listMovimentacoes.execute(unidadeId);
  }

  @Get('export')
  async export(
    @Param('unidadeId') unidadeId: string,
    @Query('formato') formato: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.visualizar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);

    const payload = await this.exportEstoque.execute(unidadeId);
    const fmt = this.exportEstoque.normalizeFormato(formato);
    const slug = payload.unidadeNome.replace(/\s+/g, '_').toLowerCase();
    const stamp = Date.now();

    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="estoque_${slug}_${stamp}.csv"`,
      );
      res.send(this.exportEstoque.buildCsv(payload));
      return;
    }

    const pdf = this.exportEstoque.buildPdf(payload);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="estoque_${slug}_${stamp}.pdf"`,
    );
    res.send(pdf);
  }

  @Post()
  async create(
    @Param('unidadeId') unidadeId: string,
    @Body() body: CreatePecaBody,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.criar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.createPeca.execute(unidadeId, body);
  }

  @Patch(':pecaId')
  async update(
    @Param('unidadeId') unidadeId: string,
    @Param('pecaId') pecaId: string,
    @Body() body: UpdatePecaBody,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.editar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.updatePeca.execute(unidadeId, pecaId, body);
  }

  @Delete(':pecaId')
  async remove(
    @Param('unidadeId') unidadeId: string,
    @Param('pecaId') pecaId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.excluir');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    await this.deletePeca.execute(unidadeId, pecaId);
    return { ok: true };
  }
}
