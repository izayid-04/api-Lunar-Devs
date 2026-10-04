import { Module } from '@nestjs/common';
import { AgentMessagesController } from './agent-messages.controller.js';
import { MessagesController } from './messages.controller.js';
import { MessagesService } from './messages.service.js';

import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [MessagesController, AgentMessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
