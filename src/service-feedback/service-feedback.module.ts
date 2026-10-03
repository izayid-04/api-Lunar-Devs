import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceFeedback } from './entities/service-feedback.entity.js';
import { MunicipalService } from '../services/entities/municipal-service.entity.js';
import { ServiceFeedbackService } from './service-feedback.service.js';
import { ServiceFeedbackController } from './service-feedback.controller.js';
import { AgentServiceFeedbackController } from './agent-service-feedback.controller.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceFeedback, MunicipalService]),
    UsersModule,
  ],
  controllers: [
    ServiceFeedbackController,
    AgentServiceFeedbackController,
  ],
  providers: [ServiceFeedbackService],
  exports: [ServiceFeedbackService],
})
export class ServiceFeedbackModule {}
