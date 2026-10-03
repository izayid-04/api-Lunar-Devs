import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
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

  @Get('public')
  findPublic(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.findPublicIncidents(user.sub);
  }

  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.messagesService.findMine(user.sub);
  }

  @Get('mine/:id')
  findMineOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messagesService.findMineOne(user.sub, id);
  }

  // F52 : Soutenir une demande déjà déposée
  @Post(':id/support')
  @HttpCode(HttpStatus.OK)
  toggleSupport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messagesService.toggleSupport(id, user.sub);
  }
}
