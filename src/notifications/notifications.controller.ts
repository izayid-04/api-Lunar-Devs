import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../auth/jwt-auth.guard.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.findForUser(user.sub);
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const notification = await this.notificationsService.markAsRead(user.sub, id);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }
}
