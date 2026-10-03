import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MunicipalService } from './entities/municipal-service.entity.js';
import { ServiceAvailability } from './service-availability.enum.js';

@Injectable()
export class ServicesService {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(MunicipalService);
  }

  findAll(): Promise<MunicipalService[]> {
    return this.repository.find({ order: { district: 'ASC', name: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<MunicipalService> {
    const service = await this.repository.findOne({ where: { slug } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async updateAvailability(
    idOrSlug: string | number,
    dto: {
      availability: ServiceAvailability;
      availabilityMessage?: string;
      availableAgainAt?: string;
      alternative?: string;
    },
  ): Promise<MunicipalService> {
    const where = typeof idOrSlug === 'number' || !isNaN(Number(idOrSlug))
      ? [{ id: Number(idOrSlug) }, { slug: String(idOrSlug) }]
      : { slug: String(idOrSlug) };

    const service = await this.repository.findOne({ where });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    service.availability = dto.availability;
    service.availabilityMessage = dto.availabilityMessage ?? null;
    service.availableAgainAt = dto.availableAgainAt ? new Date(dto.availableAgainAt) : null;
    service.alternative = dto.alternative ?? null;

    return this.repository.save(service);
  }
}
