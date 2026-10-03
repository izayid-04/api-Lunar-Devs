import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransportLine, TransportLineStatus, TransportType } from './entities/transport-line.entity.js';
import { ListTransportsQueryDto, UpdateTransportStatusDto } from './dto/transports.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { User } from '../users/entities/user.entity.js';

@Injectable()
export class TransportsService {
  constructor(
    @InjectRepository(TransportLine)
    private readonly repository: Repository<TransportLine>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query?: ListTransportsQueryDto): Promise<TransportLine[]> {
    const qb = this.repository.createQueryBuilder('line').orderBy('line.code', 'ASC');

    if (query?.type) {
      qb.andWhere('line.type = :type', { type: query.type });
    }

    if (query?.q && query.q.trim()) {
      const search = `%${query.q.trim()}%`;
      qb.andWhere('(line.name LIKE :search OR line.code LIKE :search OR line.origin LIKE :search OR line.destination LIKE :search)', { search });
    }

    return qb.getMany();
  }

  async findByCodeOrId(identifier: string): Promise<TransportLine> {
    const isId = !isNaN(Number(identifier));
    const where = isId ? [{ id: Number(identifier) }, { code: identifier }] : { code: identifier };
    const line = await this.repository.findOne({ where });
    if (!line) {
      throw new NotFoundException(`Ligne de transport introuvable: ${identifier}`);
    }
    return line;
  }

  async updateStatus(
    identifier: string,
    dto: UpdateTransportStatusDto,
    actingUser?: User | null,
  ): Promise<TransportLine> {
    const line = await this.findByCodeOrId(identifier);

    const prevStatus = line.status;
    line.status = dto.status as TransportLineStatus;
    if (dto.statusMessage !== undefined) {
      line.statusMessage = dto.statusMessage;
    }

    const saved = await this.repository.save(line);

    await this.auditService.log({
      action: 'transport_status_updated',
      entityType: 'TransportLine',
      entityId: String(saved.id),
      details: {
        code: saved.code,
        previousStatus: prevStatus,
        newStatus: saved.status,
        statusMessage: saved.statusMessage,
      },
      author: actingUser,
    });

    return saved;
  }
}
