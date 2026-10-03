import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { Alert } from './entities/alert.entity.js';
import { AlertSeverity, AlertTarget } from './alert-enums.js';
import type { CreateAlertDto } from './dto/create-alert.dto.js';
import type { UpdateAlertDto } from './dto/update-alert.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AuditService } from '../audit/audit.service.js';

export type PublicAlert = Omit<Alert, 'author'>;

@Injectable()
export class AlertsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  private get repository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(Alert);
  }

  async findAll(): Promise<PublicAlert[]> {
    const alerts = await this.repository.find({
      order: { createdAt: 'DESC' },
    });
    return alerts.map((a) => this.toPublic(a));
  }

  async findOne(id: number): Promise<PublicAlert> {
    const alert = await this.repository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    return this.toPublic(alert);
  }

  async findActive(user?: {
    district: string | null;
    isVulnerable: boolean;
  } | null): Promise<PublicAlert[]> {
    const now = new Date();
    const qb = this.repository
      .createQueryBuilder('alert')
      .where('alert.starts_at <= :now', { now })
      .andWhere('(alert.expires_at IS NULL OR alert.expires_at >= :now)', { now });

    if (!user) {
      // Unauthenticated visitor: general alerts only
      qb.andWhere('alert.target = :allTarget', { allTarget: AlertTarget.ALL });
    } else {
      // Authenticated user: target=ALL, or matching district, or vulnerable if user is vulnerable
      const conditions: string[] = ['alert.target = :allTarget'];
      const params: Record<string, any> = { allTarget: AlertTarget.ALL, now };

      if (user.district) {
        conditions.push('(alert.target = :districtTarget AND alert.target_district = :userDistrict)');
        params.districtTarget = AlertTarget.DISTRICT;
        params.userDistrict = user.district;
      }

      if (user.isVulnerable) {
        conditions.push('alert.target = :vulnerableTarget');
        params.vulnerableTarget = AlertTarget.VULNERABLE;
      }

      qb.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    qb.orderBy('alert.starts_at', 'DESC');
    const alerts = await qb.getMany();
    return alerts.map((a) => this.toPublic(a));
  }

  async create(authorId: number, dto: CreateAlertDto): Promise<PublicAlert> {
    const alert = this.repository.create({
      title: dto.title,
      body: dto.body,
      instructions: dto.instructions ?? null,
      severity: dto.severity,
      target: dto.target,
      targetDistrict: dto.target === AlertTarget.DISTRICT ? dto.targetDistrict : null,
      startsAt: new Date(dto.startsAt),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      author: { id: authorId } as User,
    });

    const saved = await this.repository.save(alert);

    // Notify citizens concerned asynchronously
    void this.notificationsService.notifyForAlert(saved);

    const author = await this.dataSource.getRepository(User).findOne({ where: { id: authorId } });
    await this.auditService.log({
      action: 'alert_created',
      entityType: 'Alert',
      entityId: String(saved.id),
      details: {
        title: saved.title,
        severity: saved.severity,
        target: saved.target,
        targetDistrict: saved.targetDistrict,
      },
      author,
    });

    return this.toPublic(saved);
  }

  async update(id: number, dto: UpdateAlertDto, actingUserId?: number): Promise<PublicAlert> {
    const alert = await this.repository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (dto.title !== undefined) alert.title = dto.title;
    if (dto.body !== undefined) alert.body = dto.body;
    if (dto.instructions !== undefined) alert.instructions = dto.instructions;
    if (dto.severity !== undefined) alert.severity = dto.severity;
    if (dto.target !== undefined) {
      alert.target = dto.target;
      if (dto.target !== AlertTarget.DISTRICT) {
        alert.targetDistrict = null;
      }
    }
    if (dto.targetDistrict !== undefined && alert.target === AlertTarget.DISTRICT) {
      alert.targetDistrict = dto.targetDistrict;
    }
    if (dto.startsAt !== undefined) alert.startsAt = new Date(dto.startsAt);
    if (dto.expiresAt !== undefined) {
      alert.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    const saved = await this.repository.save(alert);

    const author = actingUserId ? await this.dataSource.getRepository(User).findOne({ where: { id: actingUserId } }) : null;
    await this.auditService.log({
      action: 'alert_updated',
      entityType: 'Alert',
      entityId: String(saved.id),
      details: {
        title: saved.title,
        severity: saved.severity,
        target: saved.target,
      },
      author,
    });

    return this.toPublic(saved);
  }

  async terminate(id: number, actingUserId?: number): Promise<PublicAlert> {
    const alert = await this.repository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    alert.expiresAt = new Date();
    const saved = await this.repository.save(alert);

    const author = actingUserId ? await this.dataSource.getRepository(User).findOne({ where: { id: actingUserId } }) : null;
    await this.auditService.log({
      action: 'alert_terminated',
      entityType: 'Alert',
      entityId: String(saved.id),
      details: { title: saved.title },
      author,
    });

    return this.toPublic(saved);
  }

  async remove(id: number, actingUserId?: number): Promise<void> {
    const alert = await this.repository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const author = actingUserId ? await this.dataSource.getRepository(User).findOne({ where: { id: actingUserId } }) : null;
    await this.auditService.log({
      action: 'alert_deleted',
      entityType: 'Alert',
      entityId: String(id),
      details: { title: alert.title },
      author,
    });

    await this.repository.delete(id);
  }

  private toPublic(alert: Alert): PublicAlert {
    const { author: _author, ...rest } = alert;
    return rest;
  }
}
