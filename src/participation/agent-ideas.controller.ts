import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ParticipationService } from './participation.service.js';
import { UpdateIdeaStatusDto } from './dto/update-idea-status.dto.js';
import { IdeaStatus } from './entities/idea.entity.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { UserRole } from '../users/user-role.enum.js';

@Controller('agent/ideas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class AgentIdeasController {
  constructor(private readonly participationService: ParticipationService) {}

  @Get()
  async getIdeas(@Query('status') status?: IdeaStatus) {
    return this.participationService.findAllIdeasForAgent(status);
  }

  @Patch(':id')
  async updateIdeaStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIdeaStatusDto,
  ) {
    return this.participationService.updateIdeaStatus(id, dto);
  }
}
