import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CreatePecaUseCase,
  DeletePecaUseCase,
  ListPecaMovimentacoesUseCase,
  ListPecasByUnidadeUseCase,
  UpdatePecaUseCase,
} from '../../application/pecas/pecas.use-cases';
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
