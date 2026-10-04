import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ServiceFeedbackService } from './service-feedback.service.js';
import { CreateServiceFeedbackDto } from './dto/create-service-feedback.dto.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('services')
export class ServiceFeedbackController {
  constructor(
    private readonly feedbackService: ServiceFeedbackService,
  ) {}

  @Post(':id/feedback')
  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5/min (F81)
  async postFeedback(
    @Param('id') idOrSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceFeedbackDto,
  ) {
    return this.feedbackService.submitOrUpdateFeedback(idOrSlug, user.sub, dto);
  }
}
