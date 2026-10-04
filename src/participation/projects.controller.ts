import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ParticipationService } from './participation.service.js';
import { PostConsultationResponseDto } from './dto/post-consultation-response.dto.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { HttpCacheInterceptor } from '../common/http-cache.interceptor.js';

@Controller()
@UseInterceptors(HttpCacheInterceptor)
export class ProjectsController {
  constructor(private readonly participationService: ParticipationService) {}

  @Get('projects')
  async getAllProjects() {
    return this.participationService.findAllProjects();
  }

  @Get('projects/:id')
  async getProjectById(@Param('id', ParseIntPipe) id: number) {
    return this.participationService.findProjectById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('consultations/:id/responses')
  async postConsultationResponse(
    @Param('id', ParseIntPipe) consultationId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PostConsultationResponseDto,
  ) {
    return this.participationService.submitOrUpdateConsultationResponse(
      consultationId,
      user.sub,
      dto,
    );
  }
}
