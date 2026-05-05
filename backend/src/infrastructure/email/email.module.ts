import { Global, Module } from '@nestjs/common';
import { EMAIL_PORT } from '../../domain/ports/email.port';
import { SmtpEmailService } from './smtp-email.service';

@Global()
@Module({
  providers: [
    SmtpEmailService,
    { provide: EMAIL_PORT, useExisting: SmtpEmailService },
  ],
  exports: [EMAIL_PORT],
})
export class EmailModule {}
