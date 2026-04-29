import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ListUnidadesUseCase } from '../../application/unidades/list-unidades.use-case';

/**
 * Listagem das unidades visíveis ao usuário autenticado (RN-08 v1: somente a própria unidade).
 */
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly listUnidades: ListUnidadesUseCase) {}

  @Get()
  findAll(@Req() req: Request) {
    return this.listUnidades.execute(req.usuarioLocal?.idUnidade);
  }
}
