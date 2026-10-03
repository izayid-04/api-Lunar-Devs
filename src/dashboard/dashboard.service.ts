import { Injectable } from '@nestjs/common';
import type {
  PublicMessageWithAuthor,
  StatusCounts,
} from '../messages/messages.service.js';
import { MessagesService } from '../messages/messages.service.js';
import { UserRole } from '../users/user-role.enum.js';
import { UsersService } from '../users/users.service.js';

const RECENT_MESSAGES_LIMIT = 5;

export interface DashboardSummary {
  citizensCount: number;
  messagesByStatus: StatusCounts;
  recentMessages: PublicMessageWithAuthor[];
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly usersService: UsersService,
    private readonly messagesService: MessagesService,
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const [citizensCount, messagesByStatus, recentMessages] =
      await Promise.all([
        this.usersService.countByRole(UserRole.CITIZEN),
        this.messagesService.getStatusCounts(),
        this.messagesService.findRecent(RECENT_MESSAGES_LIMIT),
      ]);

    return { citizensCount, messagesByStatus, recentMessages };
  }
}
