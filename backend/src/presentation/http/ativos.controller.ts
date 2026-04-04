import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateAtivoUseCase } from '../../application/ativos/create-ativo.use-case';
import { ListAtivosByUnidadeUseCase } from '../../application/ativos/list-ativos-by-unidade.use-case';

type CreateAtivoBody = {
  nome: string;
  limiteTemp?: number;
};

/**
 * CRUD mínimo de ativos por unidade (RF-04).
 * Escopo por JWT / RN-08: validar `idUnidade` contra o usuário autenticado nas próximas entregas.
 */
@Controller('unidades/:unidadeId/ativos')
export class AtivosController {
  constructor(
    private readonly listAtivos: ListAtivosByUnidadeUseCase,
    private readonly createAtivo: CreateAtivoUseCase,
  ) {}

  @Get()
  list(@Param('unidadeId') unidadeId: string) {
    return this.listAtivos.execute(unidadeId);
  }

  @Post()
  create(@Param('unidadeId') unidadeId: string, @Body() body: CreateAtivoBody) {
    return this.createAtivo.execute(unidadeId, body);
  }
}
