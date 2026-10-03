import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { CitizenMessage } from './entities/citizen-message.entity.js';
import { MessageStatusHistory } from './entities/message-status-history.entity.js';
import { MessageSupport } from './entities/message-support.entity.js';
import { Notification } from '../notifications/entities/notification.entity.js';
import { NotificationType } from '../notifications/notification-type.enum.js';
import type { CreateMessageDto } from './dto/create-message.dto.js';
import type { UpdateMessageStatusDto } from './dto/update-message-status.dto.js';
import { MessageStatus } from './message-status.enum.js';
import { MessageType } from './message-type.enum.js';
import { buildMessageReference } from './reference.util.js';
import { AuditService } from '../audit/audit.service.js';

export interface PublicStatusHistory {
  id: number;
  status: MessageStatus;
  note: string | null;
  changedAt: Date;
  changedBy: { id: string; firstName: string; lastName: string } | null;
}

export type PublicMessage = Pick<
  CitizenMessage,
  | 'id'
  | 'reference'
  | 'type'
  | 'subject'
  | 'body'
  | 'category'
  | 'district'
  | 'preciseLocation'
  | 'status'
  | 'supportCount'
  | 'createdAt'
  | 'updatedAt'
> & {
  history?: PublicStatusHistory[];
  hasSupported?: boolean;
};

export type PublicMessageWithAuthor = PublicMessage & {
  author: { id: string; firstName: string; lastName: string; email: string } | null;
};

export type StatusCounts = Record<MessageStatus, number>;

@Injectable()
export class MessagesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private get repository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(CitizenMessage);
  }

  private get historyRepository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(MessageStatusHistory);
  }

  private get supportRepository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(MessageSupport);
  }

  async create(authorId: number, dto: CreateMessageDto): Promise<PublicMessage> {
    const isSignalement = dto.type === MessageType.SIGNALEMENT;

    return await this.dataSource.transaction(async (manager) => {
      const messageRepo = manager.getRepository(CitizenMessage);
      const historyRepo = manager.getRepository(MessageStatusHistory);

      const message = messageRepo.create({
        author: { id: authorId } as User,
        type: isSignalement ? MessageType.SIGNALEMENT : MessageType.QUESTION,
        subject: dto.subject,
        body: dto.body,
        category: dto.category,
        district: dto.district ?? null,
        preciseLocation: dto.preciseLocation ?? null,
        status: MessageStatus.NOUVEAU,
        supportCount: 0,
      });

      const saved = await messageRepo.save(message);

      const reference = buildMessageReference(saved.id);
      await messageRepo.update(saved.id, { reference });
      saved.reference = reference;

      // Create initial status history entry
      const initialHistory = historyRepo.create({
        message: saved,
        status: MessageStatus.NOUVEAU,
        note: isSignalement ? 'Signalement enregistré' : 'Message envoyé',
        changedBy: { id: authorId } as User,
      });
      await historyRepo.save(initialHistory);

      saved.history = [initialHistory];
      return this.toPublic(saved);
    });
  }

  async findMine(authorId: number): Promise<PublicMessage[]> {
    const messages = await this.repository.find({
      where: { author: { id: authorId } },
      relations: { history: { changedBy: true } },
      order: {
        createdAt: 'DESC',
        history: { changedAt: 'ASC' },
      },
    });
    return messages.map((message) => this.toPublic(message));
  }

  async findMineOne(authorId: number, id: number): Promise<PublicMessage> {
    const message = await this.repository.findOne({
      where: { id, author: { id: authorId } },
      relations: { history: { changedBy: true } },
      order: {
        history: { changedAt: 'ASC' },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.toPublic(message);
  }

  // F52 : GET /messages/public - signalements visibles par les citoyens connectés pour soutenir les signalements des autres
  async findPublicIncidents(currentUserId: number): Promise<Array<Omit<PublicMessage, 'history'> & { supportedByMe: boolean; isMine: boolean }>> {
    const messages = await this.repository.find({
      where: { type: MessageType.SIGNALEMENT },
      order: { createdAt: 'DESC' },
    });

    const supportRepo = this.dataSource.getRepository(MessageSupport);
    const userSupports = await supportRepo.find({
      where: { userId: currentUserId },
    });
    const supportedMessageIds = new Set(userSupports.map((s) => s.messageId));

    return messages.map((m) => {
      const pub = this.toPublic(m);
      return {
        id: pub.id,
        reference: pub.reference,
        type: pub.type,
        subject: pub.subject,
        body: pub.body,
        category: pub.category,
        district: pub.district,
        preciseLocation: pub.preciseLocation,
        status: pub.status,
        supportCount: pub.supportCount,
        createdAt: pub.createdAt,
        updatedAt: pub.updatedAt,
        supportedByMe: supportedMessageIds.has(m.id),
        isMine: m.authorId === currentUserId,
      };
    });
  }

  // F52 : Soutenir un signalement/message existant (toggle ou vote)
  async toggleSupport(
    messageId: number,
    userId: number,
  ): Promise<{ supported: boolean; supportCount: number }> {
    return await this.dataSource.transaction(async (manager) => {
      const messageRepo = manager.getRepository(CitizenMessage);
      const supportRepo = manager.getRepository(MessageSupport);

      const message = await messageRepo.findOne({ where: { id: messageId } });
      if (!message) {
        throw new NotFoundException('Message non trouvé');
      }

      if (message.authorId === userId) {
        throw new BadRequestException('Vous ne pouvez pas soutenir votre propre demande');
      }

      const existingSupport = await supportRepo.findOne({
        where: { messageId, userId },
      });

      let supported = false;
      if (existingSupport) {
        // Déjà soutenu -> retirer le soutien
        await supportRepo.delete(existingSupport.id);
        message.supportCount = Math.max(0, (message.supportCount || 1) - 1);
        supported = false;
      } else {
        // Pas encore soutenu -> ajouter le soutien
        const newSupport = supportRepo.create({
          messageId,
          userId,
        });
        await supportRepo.save(newSupport);
        message.supportCount = (message.supportCount || 0) + 1;
        supported = true;
      }

      await messageRepo.save(message);

      return { supported, supportCount: message.supportCount };
    });
  }

  async findForAgents(
    status?: MessageStatus,
    type?: MessageType,
    sort?: 'recent' | 'supports',
  ): Promise<{ messages: PublicMessageWithAuthor[]; counts: StatusCounts }> {
    const qb = this.repository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.author', 'author')
      .leftJoinAndSelect('message.history', 'history')
      .leftJoinAndSelect('history.changedBy', 'changedBy');

    if (status) {
      qb.andWhere('message.status = :status', { status });
    }
    if (type) {
      qb.andWhere('message.type = :type', { type });
    }

    if (sort === 'supports') {
      qb.orderBy('message.supportCount', 'DESC').addOrderBy(
        'message.createdAt',
        'DESC',
      );
    } else {
      qb.orderBy('message.createdAt', 'DESC');
    }

    qb.addOrderBy('history.changedAt', 'ASC');

    const [messages, counts] = await Promise.all([
      qb.getMany(),
      this.countByStatus(type),
    ]);

    return {
      messages: messages.map((message) => this.toPublicWithAuthor(message)),
      counts,
    };
  }

  // F49 : Mise à jour de statut avec création automatique de notification pour l'auteur
  async updateStatus(
    id: number,
    dto: UpdateMessageStatusDto,
    changedById?: number,
  ): Promise<PublicMessage> {
    return await this.dataSource.transaction(async (manager) => {
      const messageRepo = manager.getRepository(CitizenMessage);
      const historyRepo = manager.getRepository(MessageStatusHistory);
      const notifRepo = manager.getRepository(Notification);

      const message = await messageRepo.findOne({
        where: { id },
        relations: { author: true, history: { changedBy: true } },
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      const previousStatus = message.status;
      message.status = dto.status;
      const saved = await messageRepo.save(message);

      const historyEntry = historyRepo.create({
        message: saved,
        status: dto.status,
        note: dto.note ?? null,
        changedBy: changedById ? ({ id: changedById } as User) : null,
      });
      await historyRepo.save(historyEntry);

      if (!saved.history) saved.history = [];
      saved.history.push(historyEntry);

      // F49 : Notification automatique envoyée à l'habitant
      if (message.author && previousStatus !== dto.status) {
        const notif = notifRepo.create({
          user: message.author,
          type: NotificationType.DEMANDE_STATUT,
          title: `Votre demande ${saved.reference ?? `#${saved.id}`} est passée à l'état : ${dto.status.replace('_', ' ')}`,
          link: `/messages/mine/${saved.id}`,
        });
        await notifRepo.save(notif);
      }

      // F47/F48 : Traçabilité dans le journal d'audit
      const changedByUser = changedById ? await manager.getRepository(User).findOne({ where: { id: changedById } }) : null;
      await this.auditService.log({
        action: 'message_status_updated',
        entityType: 'CitizenMessage',
        entityId: String(saved.id),
        details: {
          reference: saved.reference,
          previousStatus,
          newStatus: dto.status,
          note: dto.note ?? null,
        },
        author: changedByUser,
      });

      return this.toPublic(saved);
    });
  }

  getStatusCounts(type?: MessageType): Promise<StatusCounts> {
    return this.countByStatus(type);
  }

  async findRecent(limit: number): Promise<PublicMessageWithAuthor[]> {
    const messages = await this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: { author: true },
    });
    return messages.map((message) => this.toPublicWithAuthor(message));
  }

  // F50 : Métriques agrégées pour le tableau de bord
  async getMetricsByDistrictAndCategory(): Promise<{
    byCategory: Record<string, number>;
    byDistrict: Record<string, number>;
    totalSupports: number;
  }> {
    const [categoryRows, districtRows, supportTotal] = await Promise.all([
      this.repository
        .createQueryBuilder('m')
        .select('m.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .groupBy('m.category')
        .getRawMany<{ category: string; count: string }>(),
      this.repository
        .createQueryBuilder('m')
        .select('m.district', 'district')
        .addSelect('COUNT(*)', 'count')
        .where('m.district IS NOT NULL')
        .groupBy('m.district')
        .getRawMany<{ district: string; count: string }>(),
      this.repository
        .createQueryBuilder('m')
        .select('COALESCE(SUM(m.support_count), 0)', 'total')
        .getRawOne<{ total: string }>(),
    ]);

    const byCategory: Record<string, number> = {};
    for (const r of categoryRows) {
      byCategory[r.category] = Number(r.count);
    }

    const byDistrict: Record<string, number> = {};
    for (const r of districtRows) {
      byDistrict[r.district] = Number(r.count);
    }

    return {
      byCategory,
      byDistrict,
      totalSupports: Number(supportTotal?.total || 0),
    };
  }

  private async countByStatus(type?: MessageType): Promise<StatusCounts> {
    const qb = this.repository
      .createQueryBuilder('message')
      .select('message.status', 'status')
      .addSelect('COUNT(*)', 'count');

    if (type) {
      qb.where('message.type = :type', { type });
    }

    const rows = await qb
      .groupBy('message.status')
      .getRawMany<{ status: MessageStatus; count: string }>();

    const counts = {
      [MessageStatus.NOUVEAU]: 0,
      [MessageStatus.EN_COURS]: 0,
      [MessageStatus.TRAITE]: 0,
    } as StatusCounts;

    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }
    return counts;
  }

  private toPublic(message: CitizenMessage): PublicMessage {
    return {
      id: message.id,
      reference: message.reference,
      type: message.type,
      subject: message.subject,
      body: message.body,
      category: message.category,
      district: message.district,
      preciseLocation: message.preciseLocation,
      status: message.status,
      supportCount: message.supportCount || 0,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      history: message.history
        ? message.history.map((h) => ({
            id: h.id,
            status: h.status,
            note: h.note,
            changedAt: h.changedAt,
            changedBy: h.changedBy
              ? {
                  id: String(h.changedBy.id),
                  firstName: h.changedBy.firstName,
                  lastName: h.changedBy.lastName,
                }
              : null,
          }))
        : undefined,
    };
  }

  private toPublicWithAuthor(message: CitizenMessage): PublicMessageWithAuthor {
    return {
      ...this.toPublic(message),
      author: message.author
        ? {
            id: String(message.author.id),
            firstName: message.author.firstName,
            lastName: message.author.lastName,
            email: message.author.email,
          }
        : null,
    };
  }
}
