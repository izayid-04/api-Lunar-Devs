import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module.js';
import { UsersModule } from '../users/users.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [UsersModule, MessagesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
