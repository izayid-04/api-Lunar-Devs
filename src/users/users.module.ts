import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { AgentCitizensController } from './agent-citizens.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [NotificationsModule, forwardRef(() => AuthModule)],
  controllers: [AgentCitizensController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

