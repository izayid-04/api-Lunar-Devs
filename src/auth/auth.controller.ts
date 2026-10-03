import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { JwtAuthGuard, type AuthenticatedUser } from './jwt-auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import { UserRole } from '../users/user-role.enum.js';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginAttemptsService: LoginAttemptsService,
  ) {}

  @Post('auth/register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 reg/min per IP
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60000 } }) // 15 login attempts/min per IP
  login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.authService.login(dto, ip);
  }

  @Get('me/security')
  @UseGuards(JwtAuthGuard)
  getMySecurityInfo(@CurrentUser() user: AuthenticatedUser) {
    return this.loginAttemptsService.getMyRecentAttempts(user.email);
  }

  @Get('agent/security/targeted-accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  getTargetedAccounts() {
    return this.loginAttemptsService.getTargetedAccounts();
  }
}
