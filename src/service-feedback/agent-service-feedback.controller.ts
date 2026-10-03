import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServiceFeedbackService } from './service-feedback.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../users/user-role.enum.js';

@Controller('agent/service-feedbacks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class AgentServiceFeedbackController {
  constructor(
    private readonly feedbackService: ServiceFeedbackService,
  ) {}

  @Get()
  async getFeedbacks(@Query('serviceId') serviceId?: string) {
    const numId = serviceId ? Number(serviceId) : undefined;
    return this.feedbackService.findAllForAgent(numId);
  }
}
