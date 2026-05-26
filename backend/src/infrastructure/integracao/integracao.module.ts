import { Global, Module } from '@nestjs/common';
import { IntegracaoCircuitBreakerService } from './integracao-circuit-breaker.service';
import { IntegracaoWebhookService } from './integracao-webhook.service';

@Global()
@Module({
  providers: [IntegracaoCircuitBreakerService, IntegracaoWebhookService],
  exports: [IntegracaoCircuitBreakerService, IntegracaoWebhookService],
})
export class IntegracaoModule {}
