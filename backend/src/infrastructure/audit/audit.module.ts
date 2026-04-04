import { Global, Module } from '@nestjs/common';
import { AUDIT_LOG_PORT } from '../../domain/ports/audit-log.port';
import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  providers: [
    AuditLogService,
    { provide: AUDIT_LOG_PORT, useExisting: AuditLogService },
  ],
  exports: [AUDIT_LOG_PORT],
})
export class AuditModule {}
