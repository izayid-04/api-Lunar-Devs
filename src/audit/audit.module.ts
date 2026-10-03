import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditService } from './audit.service.js';
import { AgentAuditController } from './agent-audit.controller.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AgentAuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
