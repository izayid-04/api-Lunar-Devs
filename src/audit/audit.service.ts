import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto.js';
import { maskEmail, maskIp } from '../common/masking.util.js';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard.js';

export interface LogActionParams {
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | Record<string, unknown> | null;
  author?: User | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(params: LogActionParams): Promise<AuditLog> {
    const detailsStr =
      typeof params.details === 'object' && params.details !== null
        ? JSON.stringify(params.details)
        : params.details ?? null;

    const entry = this.auditRepository.create({
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      details: detailsStr,
      author: params.author ?? null,
      ipAddress: params.ipAddress ?? null,
    });

    return this.auditRepository.save(entry);
  }

  async findAll(query: ListAuditLogsQueryDto, currentUser?: AuthenticatedUser) {
    const qb = this.auditRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.author', 'author')
      .orderBy('log.createdAt', 'DESC');

    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }

    if (query.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: query.entityType });
    }

    if (query.authorId) {
      qb.andWhere('author.id = :authorId', { authorId: query.authorId });
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const isAgent = currentUser && currentUser.role === UserRole.AGENT;

    return {
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId,
        details: item.details,
        ipAddress: isAgent ? maskIp(item.ipAddress) : item.ipAddress,
        createdAt: item.createdAt,
        author: item.author
          ? {
              id: item.author.id,
              firstName: item.author.firstName,
              lastName: item.author.lastName,
              email: isAgent ? maskEmail(item.author.email) : item.author.email,
              role: item.author.role,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
