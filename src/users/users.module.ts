import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { AgentCitizensController } from './agent-citizens.controller.js';

@Module({
  controllers: [AgentCitizensController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
