import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { SimilarRequestsService } from './similar-requests.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../users/user-role.enum.js';

@Controller('agent/messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class SimilarRequestsController {
  constructor(
    private readonly similarRequestsService: SimilarRequestsService,
  ) {}

  @Get(':id/similar')
  async getSimilarMessages(@Param('id', ParseIntPipe) id: number) {
    return this.similarRequestsService.findSimilar(id);
  }
}
