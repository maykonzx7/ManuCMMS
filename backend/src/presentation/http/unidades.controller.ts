import { Controller, Get } from '@nestjs/common';
import { ListUnidadesUseCase } from '../../application/unidades/list-unidades.use-case';

/**
 * Listagem de unidades fabris (isolamento RN-08 — escopo por unidade virá nas próximas entregas).
 */
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly listUnidades: ListUnidadesUseCase) {}

  @Get()
  findAll() {
    return this.listUnidades.execute();
  }
}
