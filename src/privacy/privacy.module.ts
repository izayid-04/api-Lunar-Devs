import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivacyInquiry } from './entities/privacy-inquiry.entity.js';
import { PrivacyService } from './privacy.service.js';
import {
  AgentPrivacyInquiriesController,
  PrivacyInquiriesController,
} from './privacy.controller.js';
import { UsersModule } from '../users/users.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivacyInquiry]),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [PrivacyInquiriesController, AgentPrivacyInquiriesController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
