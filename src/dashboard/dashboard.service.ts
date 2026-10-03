import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  PublicMessageWithAuthor,
  StatusCounts,
} from '../messages/messages.service.js';
import { MessagesService } from '../messages/messages.service.js';
import { UserRole } from '../users/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import { Appointment } from '../appointments/entities/appointment.entity.js';
import { Alert } from '../alerts/entities/alert.entity.js';

const RECENT_MESSAGES_LIMIT = 5;

export interface DashboardSummary {
  citizensCount: number;
  messagesByStatus: StatusCounts;
  recentMessages: PublicMessageWithAuthor[];
  // F50 : Métriques enrichies de suivi
  metrics: {
    byCategory: Record<string, number>;
    byDistrict: Record<string, number>;
    totalSupports: number;
    upcomingAppointmentsCount: number;
    activeAlertsCount: number;
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly usersService: UsersService,
    private readonly messagesService: MessagesService,
    private readonly dataSource: DataSource,
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const apptRepo = this.dataSource.getRepository(Appointment);
    const alertRepo = this.dataSource.getRepository(Alert);

    const [
      citizensCount,
      messagesByStatus,
      recentMessages,
      messageMetrics,
      upcomingAppointmentsCount,
      activeAlertsCount,
    ] = await Promise.all([
      this.usersService.countByRole(UserRole.CITIZEN),
      this.messagesService.getStatusCounts(),
      this.messagesService.findRecent(RECENT_MESSAGES_LIMIT),
      this.messagesService.getMetricsByDistrictAndCategory(),
      apptRepo.count({
        where: {
          slot: { startsAt: undefined } as any,
        },
      }).catch(() => 0),
      alertRepo.count().catch(() => 0),
    ]);

    return {
      citizensCount,
      messagesByStatus,
      recentMessages,
      metrics: {
        byCategory: messageMetrics.byCategory,
        byDistrict: messageMetrics.byDistrict,
        totalSupports: messageMetrics.totalSupports,
        upcomingAppointmentsCount,
        activeAlertsCount,
      },
    };
  }
}
