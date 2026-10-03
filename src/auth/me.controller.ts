import { Body, Controller, Delete, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../users/users.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import type { AuthenticatedUser } from './jwt-auth.guard.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findSafeById(user.sub);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  // D03 / F37 : Changement de mot de passe sécurisé
  @Patch('password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.usersService.changePassword(user.sub, dto, ip);
  }

  // F33 : suppression de son propre compte avec confirmation par mot de passe
  @Delete()
  deleteAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.usersService.deleteAccount(user.sub, dto.password);
  }
}

