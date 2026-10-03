import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../users/user-role.enum.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { MessagesService } from './messages.service.js';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CITIZEN)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.create(user.sub, dto);
  }

  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.findMine(user.sub);
  }
}
