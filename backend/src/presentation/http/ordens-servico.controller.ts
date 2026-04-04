import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateOrdemServicoUseCase } from '../../application/ordens-servico/create-ordem-servico.use-case';
import { FecharOrdemServicoUseCase } from '../../application/ordens-servico/fechar-ordem-servico.use-case';
import { ListOrdensServicoByUnidadeUseCase } from '../../application/ordens-servico/list-ordens-servico-by-unidade.use-case';

type CreateOrdemServicoBody = {
  idAtivo: string;
  tipo: string;
  descricao: string;
  idTecnico?: string | null;
};

type FecharOrdemServicoBody = {
  assinaturaDigital: string;
  fotoAnexo?: string | null;
  fotoProblema?: string | null;
  fotoSolucao?: string | null;
};

/**
 * OS por unidade (via ativo — RN-05). Fechamento: RN-02, RN-13, RN-14.
 * RN-08: restringir `unidadeId` ao JWT nas próximas entregas.
 */
@Controller('unidades/:unidadeId/ordens-servico')
export class OrdensServicoController {
  constructor(
    private readonly listOrdens: ListOrdensServicoByUnidadeUseCase,
    private readonly createOrdem: CreateOrdemServicoUseCase,
    private readonly fecharOrdem: FecharOrdemServicoUseCase,
  ) {}

  @Get()
  list(@Param('unidadeId') unidadeId: string) {
    return this.listOrdens.execute(unidadeId);
  }

  @Post()
  create(
    @Param('unidadeId') unidadeId: string,
    @Body() body: CreateOrdemServicoBody,
  ) {
    return this.createOrdem.execute(unidadeId, body);
  }

  @Patch(':ordemServicoId/fechar')
  fechar(
    @Param('unidadeId') unidadeId: string,
    @Param('ordemServicoId') ordemServicoId: string,
    @Body() body: FecharOrdemServicoBody,
  ) {
    return this.fecharOrdem.execute(unidadeId, ordemServicoId, body);
  }
}
