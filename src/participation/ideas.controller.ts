import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ParticipationService } from './participation.service.js';
import { CreateIdeaDto } from './dto/create-idea.dto.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('ideas')
@UseGuards(JwtAuthGuard)
export class IdeasController {
  constructor(private readonly participationService: ParticipationService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5/min (F81)
  async submitIdea(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateIdeaDto,
  ) {
    return this.participationService.createIdea(user.sub, dto);
  }

  @Get('mine')
  async getMyIdeas(@CurrentUser() user: AuthenticatedUser) {
    return this.participationService.findCitizenIdeas(user.sub);
  }
}
