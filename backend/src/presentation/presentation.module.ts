import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from './auth/auth.module';
import { AppService } from '../application/app.service';
import { CreateAtivoUseCase } from '../application/ativos/create-ativo.use-case';
import { DeleteAtivoUseCase } from '../application/ativos/delete-ativo.use-case';
import { GetAtivoByIdUseCase } from '../application/ativos/get-ativo-by-id.use-case';
import { ListAtivosByUnidadeUseCase } from '../application/ativos/list-ativos-by-unidade.use-case';
import { UpdateAtivoUseCase } from '../application/ativos/update-ativo.use-case';
import { UpdateAtivoFotoUseCase } from '../application/ativos/update-ativo-foto.use-case';
import {
  CreateAtivoDocumentoUseCase,
  DeleteAtivoDocumentoUseCase,
  ListAtivoDocumentosUseCase,
} from '../application/ativos/ativo-documentos.use-cases';
import { AuthorizeUsuarioPermissionUseCase } from '../application/iam/authorize-usuario-permission.use-case';
import { RemoveUsuarioAcessoUseCase } from '../application/iam/remove-usuario-acesso.use-case';
import { UpdateUsuarioEmpresaStatusUseCase } from '../application/iam/update-usuario-empresa-status.use-case';
import { AuthorizePlatformOperatorUseCase } from '../application/iam/authorize-platform-operator.use-case';
import { EnforceUnidadeScopeUseCase } from '../application/iam/enforce-unidade-scope.use-case';
import { GetUsuarioByIdInUnidadeUseCase } from '../application/iam/get-usuario-by-id-in-unidade.use-case';
import { UpdateMeuPerfilUseCase } from '../application/iam/update-meu-perfil.use-case';
import { ListUsuariosByUnidadeUseCase } from '../application/iam/list-usuarios-by-unidade.use-case';
import { ActivateConviteAcessoUseCase } from '../application/onboarding/activate-convite-acesso.use-case';
import { AcceptConviteAcessoUseCase } from '../application/onboarding/accept-convite-acesso.use-case';
import { CancelConviteAcessoUseCase } from '../application/onboarding/cancel-convite-acesso.use-case';
import { CreateConviteAcessoUseCase } from '../application/onboarding/create-convite-acesso.use-case';
import { CreateEmpresaWithInviteUseCase } from '../application/onboarding/create-empresa-with-invite.use-case';
import { ListConvitesAcessoUseCase } from '../application/onboarding/list-convites-acesso.use-case';
import { ResendConviteAcessoUseCase } from '../application/onboarding/resend-convite-acesso.use-case';
import { NotificacaoService } from '../application/notificacoes/notificacao.service';
import { CreateOrdemServicoComentarioUseCase } from '../application/ordens-servico/create-ordem-servico-comentario.use-case';
import { ExportOrdemServicoUseCase } from '../application/ordens-servico/export-ordem-servico.use-case';
import { ListOrdemServicoComentariosUseCase } from '../application/ordens-servico/list-ordem-servico-comentarios.use-case';
import { CancelarOrdemServicoUseCase } from '../application/ordens-servico/cancelar-ordem-servico.use-case';
import { CreateOrdemServicoUseCase } from '../application/ordens-servico/create-ordem-servico.use-case';
import { FecharOrdemServicoUseCase } from '../application/ordens-servico/fechar-ordem-servico.use-case';
import { GetOrdemServicoByIdUseCase } from '../application/ordens-servico/get-ordem-servico-by-id.use-case';
import { IniciarExecucaoOrdemServicoUseCase } from '../application/ordens-servico/iniciar-execucao-ordem-servico.use-case';
import { ListOrdensServicoByAtivoUseCase } from '../application/ordens-servico/list-ordens-servico-by-ativo.use-case';
import { ListOrdensServicoByUnidadeUseCase } from '../application/ordens-servico/list-ordens-servico-by-unidade.use-case';
import {
  CreatePecaUseCase,
  DeletePecaUseCase,
  ListPecaMovimentacoesUseCase,
  ListPecasByUnidadeUseCase,
  UpdatePecaUseCase,
} from '../application/pecas/pecas.use-cases';
import { ExportPecasEstoqueUseCase } from '../application/pecas/export-pecas-estoque.use-case';
import { EscalarOrdemServicoUseCase } from '../application/ordens-servico/escalar-ordem-servico.use-case';
import { OrdemServicoSlaMonitorService } from '../application/ordens-servico/sla-monitor.service';
import { UpdateOrdemServicoUseCase } from '../application/ordens-servico/update-ordem-servico.use-case';
import {
  CreateOrdemServicoAnexoUseCase,
  DeleteOrdemServicoAnexoUseCase,
  ListOrdemServicoAnexosUseCase,
} from '../application/ordens-servico/ordem-servico-anexos.use-cases';
import { GetUnidadeByIdUseCase } from '../application/unidades/get-unidade-by-id.use-case';
import { ListUnidadesUseCase } from '../application/unidades/list-unidades.use-case';
import { AppController } from './http/app.controller';
import { AuthPublicController } from './http/auth-public.controller';
import { AuthSessionController } from './http/auth-session.controller';
import { AuditoriaController } from './http/auditoria.controller';
import { AtivosController } from './http/ativos.controller';
import { PecasController } from './http/pecas.controller';
import { DashboardController } from './http/dashboard.controller';
import { GetDashboardExecutivoUseCase } from '../application/dashboard/get-dashboard-executivo.use-case';
import { OrdensServicoController } from './http/ordens-servico.controller';
import { HealthController } from './http/health.controller';
import { IntegracoesController } from './http/integracoes.controller';
import { IntegracaoParceiroController } from './http/integracao-parceiro.controller';
import { GestaoEmpresaController } from './http/gestao-empresa.controller';
import { MeController } from './http/me.controller';
import { OnboardingController } from './http/onboarding.controller';
import { NotificacoesController } from './http/notificacoes.controller';
import { RelatoriosController } from './http/relatorios.controller';
import { PlatformAdminController } from './http/platform-admin.controller';
import { UnidadesController } from './http/unidades.controller';
import { UsuariosController } from './http/usuarios.controller';
import { PostgresHealthIndicator } from '../infrastructure/health/postgres-health.indicator';
import { MongoHealthIndicator } from '../infrastructure/health/mongo-health.indicator';
import { RabbitmqHealthIndicator } from '../infrastructure/health/rabbitmq-health.indicator';
import { RedisHealthIndicator } from '../infrastructure/health/redis-health.indicator';
import { RequestRateLimitService } from './http/request-rate-limit.service';
import { SupabaseAdminService } from '../infrastructure/auth/supabase-admin.service';
import { SupabaseStorageService } from '../infrastructure/storage/supabase-storage.service';
import { ManagedUploadService } from '../infrastructure/storage/managed-upload.service';

@Module({
  imports: [TerminusModule, AuthModule],
  controllers: [
    AppController,
    AuthPublicController,
    AuthSessionController,
    HealthController,
    DashboardController,
    AuditoriaController,
    IntegracoesController,
    IntegracaoParceiroController,
    GestaoEmpresaController,
    MeController,
    OnboardingController,
    NotificacoesController,
    RelatoriosController,
    PlatformAdminController,
    UnidadesController,
    AtivosController,
    PecasController,
    OrdensServicoController,
    UsuariosController,
  ],
  providers: [
    AppService,
    ListUnidadesUseCase,
    GetUnidadeByIdUseCase,
    ListUsuariosByUnidadeUseCase,
    GetUsuarioByIdInUnidadeUseCase,
    UpdateMeuPerfilUseCase,
    AuthorizeUsuarioPermissionUseCase,
    RemoveUsuarioAcessoUseCase,
    UpdateUsuarioEmpresaStatusUseCase,
    AuthorizePlatformOperatorUseCase,
    EnforceUnidadeScopeUseCase,
    CreateEmpresaWithInviteUseCase,
    CreateConviteAcessoUseCase,
    ListConvitesAcessoUseCase,
    CancelConviteAcessoUseCase,
    ResendConviteAcessoUseCase,
    ActivateConviteAcessoUseCase,
    AcceptConviteAcessoUseCase,
    SupabaseAdminService,
    SupabaseStorageService,
    ManagedUploadService,
    NotificacaoService,
    ListAtivosByUnidadeUseCase,
    CreateAtivoUseCase,
    GetAtivoByIdUseCase,
    UpdateAtivoUseCase,
    UpdateAtivoFotoUseCase,
    DeleteAtivoUseCase,
    ListAtivoDocumentosUseCase,
    CreateAtivoDocumentoUseCase,
    DeleteAtivoDocumentoUseCase,
    GetDashboardExecutivoUseCase,
    ListOrdensServicoByUnidadeUseCase,
    ListOrdensServicoByAtivoUseCase,
    ListPecasByUnidadeUseCase,
    ListPecaMovimentacoesUseCase,
    CreatePecaUseCase,
    UpdatePecaUseCase,
    DeletePecaUseCase,
    ExportPecasEstoqueUseCase,
    CreateOrdemServicoUseCase,
    GetOrdemServicoByIdUseCase,
    UpdateOrdemServicoUseCase,
    FecharOrdemServicoUseCase,
    IniciarExecucaoOrdemServicoUseCase,
    EscalarOrdemServicoUseCase,
    OrdemServicoSlaMonitorService,
    CancelarOrdemServicoUseCase,
    ListOrdemServicoComentariosUseCase,
    CreateOrdemServicoComentarioUseCase,
    ExportOrdemServicoUseCase,
    ListOrdemServicoAnexosUseCase,
    CreateOrdemServicoAnexoUseCase,
    DeleteOrdemServicoAnexoUseCase,
    PostgresHealthIndicator,
    MongoHealthIndicator,
    RabbitmqHealthIndicator,
    RedisHealthIndicator,
    RequestRateLimitService,
  ],
})
export class PresentationModule {}
