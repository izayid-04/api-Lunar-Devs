import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransportLine } from './entities/transport-line.entity.js';
import { TransportsService } from './transports.service.js';
import { TransportsController } from './transports.controller.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([TransportLine]), UsersModule],
  controllers: [TransportsController],
  providers: [TransportsService],
  exports: [TransportsService],
})
export class TransportsModule {}
