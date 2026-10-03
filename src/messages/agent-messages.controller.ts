import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UserRole } from '../users/user-role.enum.js';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto.js';
import { UpdateMessageStatusDto } from './dto/update-message-status.dto.js';
import { MessagesService } from './messages.service.js';

@Controller('agent/messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.AGENT, UserRole.ADMIN)
export class AgentMessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findAll(@Query() query: ListMessagesQueryDto) {
    return this.messagesService.findForAgents(query.status);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMessageStatusDto,
  ) {
    return this.messagesService.updateStatus(id, dto.status);
  }
}
