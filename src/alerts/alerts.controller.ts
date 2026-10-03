import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../users/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import { AlertsService } from './alerts.service.js';
import { AlertsAiService } from './alerts-ai.service.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { UpdateAlertDto } from './dto/update-alert.dto.js';
import { AiRecommendationDto } from './dto/ai-recommendation.dto.js';

@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  @Get('active')
  async getActive(@Req() request: Request) {
    // Optional JWT authentication: extract token if present to check district/vulnerability
    let userContext: { district: string | null; isVulnerable: boolean } | null = null;
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
        const user = await this.usersService.findById(payload.sub);
        if (user) {
          userContext = {
            district: user.district,
            isVulnerable: user.isVulnerable,
          };
        }
      } catch {
        // Invalid or expired token: fall back to anonymous visitor
      }
    }

    return this.alertsService.findActive(userContext);
  }

  @Get()
  async findAll() {
    return this.alertsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.alertsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAlertDto,
  ) {
    return this.alertsService.create(user.sub, dto);
  }

  @Patch(':id/terminate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async terminate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertsService.terminate(id, user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlertDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.alertsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.alertsService.remove(id, user.sub);
  }
}

@Controller('agent/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class AgentAlertsController {
  constructor(private readonly alertsAiService: AlertsAiService) {}

  @Post('ai-recommendations')
  async getAiRecommendations(@Body() dto: AiRecommendationDto) {
    return this.alertsAiService.generateRecommendations(dto);
  }
}
