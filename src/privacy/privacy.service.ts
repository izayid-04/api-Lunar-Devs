import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PrivacyInquiry,
  PrivacyInquiryStatus,
  PrivacyInquiryType,
} from './entities/privacy-inquiry.entity.js';
import {
  CreatePrivacyInquiryDto,
  UpdatePrivacyInquiryStatusDto,
} from './dto/privacy-inquiry.dto.js';
import { User } from '../users/entities/user.entity.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/notification-type.enum.js';

@Injectable()
export class PrivacyService {
  constructor(
    @InjectRepository(PrivacyInquiry)
    private readonly repository: Repository<PrivacyInquiry>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(citizenId: number, dto: CreatePrivacyInquiryDto): Promise<PrivacyInquiry> {
    const count = await this.repository.count();
    const reference = `RGPD-2026-${String(count + 1).padStart(4, '0')}`;

    const inquiry = this.repository.create({
      reference,
      type: dto.type,
      subject: dto.subject,
      description: dto.description,
      status: PrivacyInquiryStatus.PENDING,
      citizen: { id: citizenId } as User,
    });

    const saved = await this.repository.save(inquiry);

    await this.auditService.log({
      action: 'privacy_inquiry_created',
      entityType: 'PrivacyInquiry',
      entityId: String(saved.id),
      details: {
        reference: saved.reference,
        type: saved.type,
        subject: saved.subject,
      },
      author: { id: citizenId } as User,
    });

    return saved;
  }

  async findMine(citizenId: number): Promise<PrivacyInquiry[]> {
    return this.repository.find({
      where: { citizen: { id: citizenId } },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllForStaff(status?: PrivacyInquiryStatus): Promise<PrivacyInquiry[]> {
    const qb = this.repository
      .createQueryBuilder('inquiry')
      .leftJoinAndSelect('inquiry.citizen', 'citizen')
      .leftJoinAndSelect('inquiry.respondedBy', 'respondedBy')
      .orderBy('inquiry.createdAt', 'DESC');

    if (status) {
      qb.andWhere('inquiry.status = :status', { status });
    }

    return qb.getMany();
  }

  async updateStatus(
    id: number,
    dto: UpdatePrivacyInquiryStatusDto,
    staffUser: User,
  ): Promise<PrivacyInquiry> {
    const inquiry = await this.repository.findOne({
      where: { id },
      relations: { citizen: true },
    });

    if (!inquiry) {
      throw new NotFoundException('Demande relative aux données personnelles introuvable');
    }

    const prevStatus = inquiry.status;
    inquiry.status = dto.status;
    if (dto.responseNote) {
      inquiry.responseNote = dto.responseNote;
    }
    inquiry.respondedAt = new Date();
    inquiry.respondedBy = staffUser;

    const saved = await this.repository.save(inquiry);

    // Notifier le citoyen
    if (inquiry.citizen) {
      await this.notificationsService.create({
        user: inquiry.citizen,
        type: NotificationType.DEMANDE_STATUT,
        title: `Mise à jour concernant votre demande RGPD ${saved.reference} : statut ${saved.status}`,
        link: `/privacy/inquiries/${saved.id}`,
      });
    }

    await this.auditService.log({
      action: 'privacy_inquiry_status_updated',
      entityType: 'PrivacyInquiry',
      entityId: String(saved.id),
      details: {
        reference: saved.reference,
        previousStatus: prevStatus,
        newStatus: saved.status,
        hasResponseNote: Boolean(dto.responseNote),
      },
      author: staffUser,
    });

    return saved;
  }
}
