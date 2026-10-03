import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './entities/partner.entity.js';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
  ) {}

  async findAll(district?: string): Promise<Partner[]> {
    if (district) {
      return this.partnerRepository.find({
        where: { district },
        order: { name: 'ASC' },
      });
    }
    return this.partnerRepository.find({
      order: { name: 'ASC' },
    });
  }
}
