import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { NotificationType } from './notification-type.enum.js';
import { Notification } from './entities/notification.entity.js';
import { Alert } from '../alerts/entities/alert.entity.js';
import { AlertTarget } from '../alerts/alert-enums.js';
import { Announcement } from '../announcements/entities/announcement.entity.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(Notification);
  }

  private get userRepository() {
    return this.dataSource.getRepository(User);
  }

  async findForUser(userId: number): Promise<Notification[]> {
    await this.generateAppointmentReminders(userId);

    return this.repository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  private async generateAppointmentReminders(userId: number): Promise<void> {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 3600 * 1000);

      // Lazy import or fetch Appointment from DataSource to avoid circular dependency
      const appointmentRepo = this.dataSource.getRepository('appointments');
      const upcoming = await appointmentRepo
        .createQueryBuilder('apt')
        .innerJoinAndSelect('apt.slot', 'slot')
        .innerJoinAndSelect('slot.service', 'service')
        .where('apt.citizen_id = :userId', { userId })
        .andWhere('apt.status = :status', { status: 'confirme' })
        .andWhere('slot.starts_at > :now', { now })
        .andWhere('slot.starts_at <= :in24h', { in24h })
        .getMany();

      for (const apt of upcoming) {
        const link = `/appointments/${apt.id}`;
        const existing = await this.repository.findOne({
          where: {
            user: { id: userId },
            link,
            type: NotificationType.APPOINTMENT_REMINDER,
          },
        });

        if (!existing) {
          const notif = new Notification();
          notif.user = { id: userId } as User;
          notif.type = NotificationType.APPOINTMENT_REMINDER;
          notif.title = `[Rappel Rendez-vous] Votre rendez-vous pour ${apt.slot?.service?.name ?? 'votre démarche'} a lieu dans moins de 24h.`;
          notif.link = link;
          await this.repository.save(notif);
        }
      }
    } catch (err) {
      this.logger.error('Error generating appointment reminders:', err);
    }
  }

  async markAsRead(userId: number, notificationId: number): Promise<Notification | null> {
    const notification = await this.repository.findOne({
      where: { id: notificationId, user: { id: userId } },
    });
    if (!notification) {
      return null;
    }
    notification.readAt = new Date();
    return this.repository.save(notification);
  }

  async notifyForAlert(alert: Alert): Promise<number> {
    try {
      const qb = this.userRepository.createQueryBuilder('user');

      if (alert.target === AlertTarget.DISTRICT && alert.targetDistrict) {
        qb.where('user.district = :district', { district: alert.targetDistrict });
      } else if (alert.target === AlertTarget.VULNERABLE) {
        qb.where('user.is_vulnerable = true');
      }

      const users = await qb.select(['user.id']).getMany();
      if (users.length === 0) return 0;

      const notifications = users.map((u) => {
        const notif = new Notification();
        notif.user = u;
        notif.type = NotificationType.ALERT;
        notif.title = `[Alerte] ${alert.title}`;
        notif.link = `/alerts/${alert.id}`;
        return notif;
      });

      // Batch save in chunks of 500 to avoid excessive single query limits
      const chunkSize = 500;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        await this.repository.save(notifications.slice(i, i + chunkSize));
      }

      return notifications.length;
    } catch (err) {
      this.logger.error('Failed to dispatch notifications for alert:', err);
      return 0;
    }
  }

  async notifyForImportantAnnouncement(announcement: Announcement): Promise<number> {
    try {
      const users = await this.userRepository.find({ select: { id: true } });
      if (users.length === 0) return 0;

      const notifications = users.map((u) => {
        const notif = new Notification();
        notif.user = u;
        notif.type = NotificationType.ANNOUNCEMENT;
        notif.title = `[Annonce importante] ${announcement.title}`;
        notif.link = `/announcements/${announcement.id}`;
        return notif;
      });

      const chunkSize = 500;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        await this.repository.save(notifications.slice(i, i + chunkSize));
      }

      return notifications.length;
    } catch (err) {
      this.logger.error('Failed to dispatch notifications for announcement:', err);
      return 0;
    }
  }
}
