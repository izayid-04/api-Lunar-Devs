import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
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
}
