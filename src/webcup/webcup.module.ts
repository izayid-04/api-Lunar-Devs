import { Module } from '@nestjs/common';
import { WebcupController } from './webcup.controller.js';
import { WebcupService } from './webcup.service.js';

@Module({
  controllers: [WebcupController],
  providers: [WebcupService],
})
export class WebcupModule {}
