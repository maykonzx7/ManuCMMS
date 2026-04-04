import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CancelarOrdemServicoUseCase } from '../../application/ordens-servico/cancelar-ordem-servico.use-case';
import { CreateOrdemServicoUseCase } from '../../application/ordens-servico/create-ordem-servico.use-case';
import { FecharOrdemServicoUseCase } from '../../application/ordens-servico/fechar-ordem-servico.use-case';
import { IniciarExecucaoOrdemServicoUseCase } from '../../application/ordens-servico/iniciar-execucao-ordem-servico.use-case';
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
 * OS por unidade (RN-05, RN-10). Iniciar execução, cancelar, fechar (RN-02/13/14).
 * Auditoria Mongo em criar/fechar/cancelar/iniciar (RN-04). RN-08: JWT + unidade depois.
 */
@Controller('unidades/:unidadeId/ordens-servico')
export class OrdensServicoController {
  constructor(
    private readonly listOrdens: ListOrdensServicoByUnidadeUseCase,
    private readonly createOrdem: CreateOrdemServicoUseCase,
    private readonly fecharOrdem: FecharOrdemServicoUseCase,
    private readonly iniciarExecucao: IniciarExecucaoOrdemServicoUseCase,
    private readonly cancelarOrdem: CancelarOrdemServicoUseCase,
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

  @Patch(':ordemServicoId/iniciar')
  iniciar(
    @Param('unidadeId') unidadeId: string,
    @Param('ordemServicoId') ordemServicoId: string,
  ) {
    return this.iniciarExecucao.execute(unidadeId, ordemServicoId);
  }

  @Patch(':ordemServicoId/cancelar')
  cancelar(
    @Param('unidadeId') unidadeId: string,
    @Param('ordemServicoId') ordemServicoId: string,
  ) {
    return this.cancelarOrdem.execute(unidadeId, ordemServicoId);
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
