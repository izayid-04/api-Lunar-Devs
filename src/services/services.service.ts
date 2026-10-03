import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MunicipalService } from './entities/municipal-service.entity.js';
import { ServiceAvailability } from './service-availability.enum.js';
import type { ListServicesQueryDto } from './dto/list-services-query.dto.js';

@Injectable()
export class ServicesService {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(MunicipalService);
  }

  // F28 + F32 + F45 + F46 : Recherche texte ?q=, filtre ?category=, ?district=, services mis en avant en premier
  async findAll(query?: ListServicesQueryDto): Promise<MunicipalService[]> {
    const qb = this.repository.createQueryBuilder('service');

    if (query?.q && query.q.trim()) {
      const search = `%${query.q.trim()}%`;
      qb.andWhere(
        '(service.name LIKE :search OR service.description LIKE :search OR service.details LIKE :search OR service.category LIKE :search)',
        { search },
      );
    }

    if (query?.category && query.category.trim()) {
      qb.andWhere('service.category = :category', {
        category: query.category.trim(),
      });
    }

    if (query?.district && query.district.trim()) {
      qb.andWhere('service.district = :district', {
        district: query.district.trim(),
      });
    }

    if (query?.featured !== undefined) {
      qb.andWhere('service.featured = :featured', {
        featured: query.featured,
      });
    }

    if (query?.emergency !== undefined) {
      qb.andWhere('service.is_emergency = :emergency', {
        emergency: query.emergency,
      });
    }

    // Services mis en avant en premier (is_featured DESC), puis par district et nom
    return qb
      .orderBy('service.featured', 'DESC')
      .addOrderBy('service.is_emergency', 'DESC')
      .addOrderBy('service.name', 'ASC')
      .getMany();
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
    const where =
      typeof idOrSlug === 'number' || !isNaN(Number(idOrSlug))
        ? [{ id: Number(idOrSlug) }, { slug: String(idOrSlug) }]
        : { slug: String(idOrSlug) };

    const service = await this.repository.findOne({ where });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    service.availability = dto.availability;
    service.availabilityMessage = dto.availabilityMessage ?? null;
    service.availableAgainAt = dto.availableAgainAt
      ? new Date(dto.availableAgainAt)
      : null;
    service.alternative = dto.alternative ?? null;

    return this.repository.save(service);
  }
}
