import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CitizenMessage } from '../messages/entities/citizen-message.entity.js';
import { SimilarRequestsService } from './similar-requests.service.js';
import { SimilarRequestsController } from './similar-requests.controller.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([CitizenMessage]), UsersModule],
  controllers: [SimilarRequestsController],
  providers: [SimilarRequestsService],
  exports: [SimilarRequestsService],
})
export class SimilarRequestsModule {}
