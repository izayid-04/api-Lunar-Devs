import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UsersModule } from '../users/users.module.js';
import { Alert } from './entities/alert.entity.js';
import { AlertsController, AgentAlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';
import { AlertsAiService } from './alerts-ai.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert]),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [AlertsController, AgentAlertsController],
  providers: [AlertsService, AlertsAiService],
  exports: [AlertsService],
})
export class AlertsModule {}
