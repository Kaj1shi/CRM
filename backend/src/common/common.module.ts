import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CodesService } from './codes.service';

@Global()
@Module({
  providers: [CodesService, AuditService],
  exports: [CodesService, AuditService],
})
export class CommonModule {}
