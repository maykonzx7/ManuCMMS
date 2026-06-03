import { Global, Module } from '@nestjs/common';
import { EMAIL_PORT } from '../../domain/ports/email.port';
import { BrevoApiEmailService } from './brevo-api-email.service';
import { EmailDeliveryService } from './email-delivery.service';
import { SmtpEmailService } from './smtp-email.service';

@Global()
@Module({
  providers: [
    SmtpEmailService,
    BrevoApiEmailService,
    EmailDeliveryService,
    { provide: EMAIL_PORT, useExisting: EmailDeliveryService },
  ],
  exports: [EMAIL_PORT, EmailDeliveryService, SmtpEmailService, BrevoApiEmailService],
})
export class EmailModule {}
