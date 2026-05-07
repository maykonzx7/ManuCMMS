import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CreateAtivoUseCase } from '../../application/ativos/create-ativo.use-case';
import { DeleteAtivoUseCase } from '../../application/ativos/delete-ativo.use-case';
import { GetAtivoByIdUseCase } from '../../application/ativos/get-ativo-by-id.use-case';
import { AuthorizeUsuarioPermissionUseCase } from '../../application/iam/authorize-usuario-permission.use-case';
import { EnforceUnidadeScopeUseCase } from '../../application/iam/enforce-unidade-scope.use-case';
import { ListAtivosByUnidadeUseCase } from '../../application/ativos/list-ativos-by-unidade.use-case';
import { UpdateAtivoUseCase } from '../../application/ativos/update-ativo.use-case';

type CreateAtivoBody = {
  nome: string;
  limiteTemp?: number;
};

type UpdateAtivoBody = {
  nome?: string;
  limiteTemp?: number;
  status?: string;
};

/**
 * CRUD mínimo de ativos por unidade (RF-04).
 * Escopo por JWT / RN-08: validar `idUnidade` contra o usuário autenticado nas próximas entregas.
 */
@Controller('unidades/:unidadeId/ativos')
export class AtivosController {
  constructor(
    private readonly listAtivos: ListAtivosByUnidadeUseCase,
    private readonly getAtivoById: GetAtivoByIdUseCase,
    private readonly createAtivo: CreateAtivoUseCase,
    private readonly updateAtivo: UpdateAtivoUseCase,
    private readonly deleteAtivo: DeleteAtivoUseCase,
    private readonly authorizePermission: AuthorizeUsuarioPermissionUseCase,
    private readonly enforceUnidadeScope: EnforceUnidadeScopeUseCase,
  ) {}

  @Get()
  async list(@Param('unidadeId') unidadeId: string, @Req() req: Request) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.visualizar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.listAtivos.execute(unidadeId);
  }

  @Post()
  async create(
    @Param('unidadeId') unidadeId: string,
    @Body() body: CreateAtivoBody,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.criar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.createAtivo.execute(unidadeId, body);
  }

  @Get(':ativoId')
  async getById(
    @Param('unidadeId') unidadeId: string,
    @Param('ativoId') ativoId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.visualizar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.getAtivoById.execute(unidadeId, ativoId);
  }

  @Patch(':ativoId')
  async update(
    @Param('unidadeId') unidadeId: string,
    @Param('ativoId') ativoId: string,
    @Body() body: UpdateAtivoBody,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.criar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    return this.updateAtivo.execute(unidadeId, ativoId, body);
  }

  @Delete(':ativoId')
  @HttpCode(204)
  async delete(
    @Param('unidadeId') unidadeId: string,
    @Param('ativoId') ativoId: string,
    @Req() req: Request,
  ) {
    this.authorizePermission.execute(req.usuarioLocal, 'ativo.criar');
    await this.enforceUnidadeScope.execute(req.usuarioLocal, unidadeId);
    await this.deleteAtivo.execute(unidadeId, ativoId);
  }
}
