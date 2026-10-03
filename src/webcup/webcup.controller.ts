import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../users/user-role.enum.js';
import { WebcupService } from './webcup.service.js';

@Controller('agent/webcup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class WebcupController {
  constructor(private readonly webcupService: WebcupService) {}

  @Get('requests')
  getRequests() {
    return this.webcupService.getRequests();
  }
}
