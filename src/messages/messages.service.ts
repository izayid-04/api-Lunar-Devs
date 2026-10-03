import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { CitizenMessage } from './entities/citizen-message.entity.js';
import type { CreateMessageDto } from './dto/create-message.dto.js';
import { MessageStatus } from './message-status.enum.js';
import { buildMessageReference } from './reference.util.js';

export type PublicMessage = Pick<
  CitizenMessage,
  | 'id'
  | 'reference'
  | 'subject'
  | 'body'
  | 'category'
  | 'status'
  | 'createdAt'
  | 'updatedAt'
>;

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

  async create(authorId: number, dto: CreateMessageDto): Promise<PublicMessage> {
    const message = this.repository.create({
      author: { id: authorId } as User,
      subject: dto.subject,
      body: dto.body,
      category: dto.category,
      status: MessageStatus.NOUVEAU,
    });
    const saved = await this.repository.save(message);

    const reference = buildMessageReference(saved.id);
    await this.repository.update(saved.id, { reference });
    saved.reference = reference;

    return this.toPublic(saved);
  }

  async findMine(authorId: number): Promise<PublicMessage[]> {
    const messages = await this.repository.find({
      where: { author: { id: authorId } },
      order: { createdAt: 'DESC' },
    });
    return messages.map((message) => this.toPublic(message));
  }

  async findForAgents(
    status?: MessageStatus,
  ): Promise<{ messages: PublicMessageWithAuthor[]; counts: StatusCounts }> {
    const [messages, counts] = await Promise.all([
      this.repository.find({
        where: status ? { status } : {},
        order: { createdAt: 'DESC' },
        relations: { author: true },
      }),
      this.countByStatus(),
    ]);

    return {
      messages: messages.map((message) => this.toPublicWithAuthor(message)),
      counts,
    };
  }

  async updateStatus(
    id: number,
    status: MessageStatus,
  ): Promise<PublicMessage> {
    const message = await this.repository.findOne({ where: { id } });
    if (!message) {
      throw new NotFoundException('Message not found');
    }
    message.status = status;
    const saved = await this.repository.save(message);
    return this.toPublic(saved);
  }

  getStatusCounts(): Promise<StatusCounts> {
    return this.countByStatus();
  }

  async findRecent(limit: number): Promise<PublicMessageWithAuthor[]> {
    const messages = await this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: { author: true },
    });
    return messages.map((message) => this.toPublicWithAuthor(message));
  }

  // Always over ALL messages, regardless of the `status` filter applied
  // to the list — lets the UI show per-status badges next to the
  // filter tabs even while one tab's list is showing.
  private async countByStatus(): Promise<StatusCounts> {
    const rows = await this.repository
      .createQueryBuilder('message')
      .select('message.status', 'status')
      .addSelect('COUNT(*)', 'count')
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
      subject: message.subject,
      body: message.body,
      category: message.category,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
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
