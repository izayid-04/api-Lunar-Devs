import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MunicipalService } from './entities/municipal-service.entity.js';

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
}
