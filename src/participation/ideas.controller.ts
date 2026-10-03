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

@Controller('ideas')
@UseGuards(JwtAuthGuard)
export class IdeasController {
  constructor(private readonly participationService: ParticipationService) {}

  @Post()
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
