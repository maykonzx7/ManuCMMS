import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AppService } from '../application/app.service';
import { CreateAtivoUseCase } from '../application/ativos/create-ativo.use-case';
import { ListAtivosByUnidadeUseCase } from '../application/ativos/list-ativos-by-unidade.use-case';
import { EnforceUnidadeScopeUseCase } from '../application/iam/enforce-unidade-scope.use-case';
import { ListUsuariosByUnidadeUseCase } from '../application/iam/list-usuarios-by-unidade.use-case';
import { CancelarOrdemServicoUseCase } from '../application/ordens-servico/cancelar-ordem-servico.use-case';
import { CreateOrdemServicoUseCase } from '../application/ordens-servico/create-ordem-servico.use-case';
import { FecharOrdemServicoUseCase } from '../application/ordens-servico/fechar-ordem-servico.use-case';
import { IniciarExecucaoOrdemServicoUseCase } from '../application/ordens-servico/iniciar-execucao-ordem-servico.use-case';
import { ListOrdensServicoByUnidadeUseCase } from '../application/ordens-servico/list-ordens-servico-by-unidade.use-case';
import { ListUnidadesUseCase } from '../application/unidades/list-unidades.use-case';
import { AppController } from './http/app.controller';
import { AtivosController } from './http/ativos.controller';
import { OrdensServicoController } from './http/ordens-servico.controller';
import { HealthController } from './http/health.controller';
import { MeController } from './http/me.controller';
import { UnidadesController } from './http/unidades.controller';
import { UsuariosController } from './http/usuarios.controller';
import { PostgresHealthIndicator } from '../infrastructure/health/postgres-health.indicator';
import { MongoHealthIndicator } from '../infrastructure/health/mongo-health.indicator';
import { RabbitmqHealthIndicator } from '../infrastructure/health/rabbitmq-health.indicator';

@Module({
  imports: [TerminusModule],
  controllers: [
    AppController,
    HealthController,
    MeController,
    UnidadesController,
    AtivosController,
    OrdensServicoController,
    UsuariosController,
  ],
  providers: [
    AppService,
    ListUnidadesUseCase,
    ListUsuariosByUnidadeUseCase,
    EnforceUnidadeScopeUseCase,
    ListAtivosByUnidadeUseCase,
    CreateAtivoUseCase,
    ListOrdensServicoByUnidadeUseCase,
    CreateOrdemServicoUseCase,
    FecharOrdemServicoUseCase,
    IniciarExecucaoOrdemServicoUseCase,
    CancelarOrdemServicoUseCase,
    PostgresHealthIndicator,
    MongoHealthIndicator,
    RabbitmqHealthIndicator,
  ],
})
export class PresentationModule {}
