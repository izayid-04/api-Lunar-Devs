import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { CitizenMessage } from './entities/citizen-message.entity.js';
import { MessageStatusHistory } from './entities/message-status-history.entity.js';
import type { CreateMessageDto } from './dto/create-message.dto.js';
import type { UpdateMessageStatusDto } from './dto/update-message-status.dto.js';
import { MessageStatus } from './message-status.enum.js';
import { MessageType } from './message-type.enum.js';
import { buildMessageReference } from './reference.util.js';

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
  | 'createdAt'
  | 'updatedAt'
> & {
  history?: PublicStatusHistory[];
};

export type PublicMessageWithAuthor = PublicMessage & {
  author: { id: string; firstName: string; lastName: string; email: string } | null;
};

export type StatusCounts = Record<MessageStatus, number>;

@Injectable()
export class MessagesService {
  constructor(private readonly dataSource: DataSource) {}

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

  async findForAgents(
    status?: MessageStatus,
    type?: MessageType,
  ): Promise<{ messages: PublicMessageWithAuthor[]; counts: StatusCounts }> {
    const where: { status?: MessageStatus; type?: MessageType } = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [messages, counts] = await Promise.all([
      this.repository.find({
        where,
        order: { createdAt: 'DESC', history: { changedAt: 'ASC' } },
        relations: { author: true, history: { changedBy: true } },
      }),
      this.countByStatus(type),
    ]);

    return {
      messages: messages.map((message) => this.toPublicWithAuthor(message)),
      counts,
    };
  }

  async updateStatus(
    id: number,
    dto: UpdateMessageStatusDto,
    changedById?: number,
  ): Promise<PublicMessage> {
    return await this.dataSource.transaction(async (manager) => {
      const messageRepo = manager.getRepository(CitizenMessage);
      const historyRepo = manager.getRepository(MessageStatusHistory);

      const message = await messageRepo.findOne({
        where: { id },
        relations: { history: { changedBy: true } },
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

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
