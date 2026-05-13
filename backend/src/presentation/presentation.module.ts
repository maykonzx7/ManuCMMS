import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AppService } from '../application/app.service';
import { CreateAtivoUseCase } from '../application/ativos/create-ativo.use-case';
import { DeleteAtivoUseCase } from '../application/ativos/delete-ativo.use-case';
import { GetAtivoByIdUseCase } from '../application/ativos/get-ativo-by-id.use-case';
import { ListAtivosByUnidadeUseCase } from '../application/ativos/list-ativos-by-unidade.use-case';
import { UpdateAtivoUseCase } from '../application/ativos/update-ativo.use-case';
import { AuthorizeUsuarioPermissionUseCase } from '../application/iam/authorize-usuario-permission.use-case';
import { EnforceUnidadeScopeUseCase } from '../application/iam/enforce-unidade-scope.use-case';
import { GetUsuarioByIdInUnidadeUseCase } from '../application/iam/get-usuario-by-id-in-unidade.use-case';
import { ListUsuariosByUnidadeUseCase } from '../application/iam/list-usuarios-by-unidade.use-case';
import { AcceptConviteAcessoUseCase } from '../application/onboarding/accept-convite-acesso.use-case';
import { CreateConviteAcessoUseCase } from '../application/onboarding/create-convite-acesso.use-case';
import { CreateEmpresaWithInviteUseCase } from '../application/onboarding/create-empresa-with-invite.use-case';
import { CancelarOrdemServicoUseCase } from '../application/ordens-servico/cancelar-ordem-servico.use-case';
import { CreateOrdemServicoUseCase } from '../application/ordens-servico/create-ordem-servico.use-case';
import { FecharOrdemServicoUseCase } from '../application/ordens-servico/fechar-ordem-servico.use-case';
import { GetOrdemServicoByIdUseCase } from '../application/ordens-servico/get-ordem-servico-by-id.use-case';
import { IniciarExecucaoOrdemServicoUseCase } from '../application/ordens-servico/iniciar-execucao-ordem-servico.use-case';
import { ListOrdensServicoByUnidadeUseCase } from '../application/ordens-servico/list-ordens-servico-by-unidade.use-case';
import { UpdateOrdemServicoUseCase } from '../application/ordens-servico/update-ordem-servico.use-case';
import { GetUnidadeByIdUseCase } from '../application/unidades/get-unidade-by-id.use-case';
import { ListUnidadesUseCase } from '../application/unidades/list-unidades.use-case';
import { AppController } from './http/app.controller';
import { AuditoriaController } from './http/auditoria.controller';
import { AtivosController } from './http/ativos.controller';
import { OrdensServicoController } from './http/ordens-servico.controller';
import { HealthController } from './http/health.controller';
import { IntegracoesController } from './http/integracoes.controller';
import { GestaoEmpresaController } from './http/gestao-empresa.controller';
import { MeController } from './http/me.controller';
import { OnboardingController } from './http/onboarding.controller';
import { RelatoriosController } from './http/relatorios.controller';
import { UnidadesController } from './http/unidades.controller';
import { UsuariosController } from './http/usuarios.controller';
import { PostgresHealthIndicator } from '../infrastructure/health/postgres-health.indicator';
import { MongoHealthIndicator } from '../infrastructure/health/mongo-health.indicator';
import { RabbitmqHealthIndicator } from '../infrastructure/health/rabbitmq-health.indicator';
import { RedisHealthIndicator } from '../infrastructure/health/redis-health.indicator';
import { RequestRateLimitService } from './http/request-rate-limit.service';

@Module({
  imports: [TerminusModule],
  controllers: [
    AppController,
    HealthController,
    AuditoriaController,
    IntegracoesController,
    GestaoEmpresaController,
    MeController,
    OnboardingController,
    RelatoriosController,
    UnidadesController,
    AtivosController,
    OrdensServicoController,
    UsuariosController,
  ],
  providers: [
    AppService,
    ListUnidadesUseCase,
    GetUnidadeByIdUseCase,
    ListUsuariosByUnidadeUseCase,
    GetUsuarioByIdInUnidadeUseCase,
    AuthorizeUsuarioPermissionUseCase,
    EnforceUnidadeScopeUseCase,
    CreateEmpresaWithInviteUseCase,
    CreateConviteAcessoUseCase,
    AcceptConviteAcessoUseCase,
    ListAtivosByUnidadeUseCase,
    CreateAtivoUseCase,
    GetAtivoByIdUseCase,
    UpdateAtivoUseCase,
    DeleteAtivoUseCase,
    ListOrdensServicoByUnidadeUseCase,
    CreateOrdemServicoUseCase,
    GetOrdemServicoByIdUseCase,
    UpdateOrdemServicoUseCase,
    FecharOrdemServicoUseCase,
    IniciarExecucaoOrdemServicoUseCase,
    CancelarOrdemServicoUseCase,
    PostgresHealthIndicator,
    MongoHealthIndicator,
    RabbitmqHealthIndicator,
    RedisHealthIndicator,
    RequestRateLimitService,
  ],
})
export class PresentationModule {}
