import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceFeedback } from './entities/service-feedback.entity.js';
import { MunicipalService } from '../services/entities/municipal-service.entity.js';
import { CreateServiceFeedbackDto } from './dto/create-service-feedback.dto.js';

@Injectable()
export class ServiceFeedbackService {
  constructor(
    @InjectRepository(ServiceFeedback)
    private readonly feedbackRepository: Repository<ServiceFeedback>,
    @InjectRepository(MunicipalService)
    private readonly serviceRepository: Repository<MunicipalService>,
  ) {}

  async submitOrUpdateFeedback(
    serviceIdOrSlug: string,
    citizenId: number,
    dto: CreateServiceFeedbackDto,
  ) {
    let service: MunicipalService | null = null;
    const numericId = Number(serviceIdOrSlug);

    if (!isNaN(numericId)) {
      service = await this.serviceRepository.findOne({ where: { id: numericId } });
    }
    if (!service) {
      service = await this.serviceRepository.findOne({ where: { slug: serviceIdOrSlug } });
    }

    if (!service) {
      throw new NotFoundException(`Service ${serviceIdOrSlug} not found`);
    }

    let existing = await this.feedbackRepository.findOne({
      where: { serviceId: service.id, citizenId },
    });

    let saved: ServiceFeedback;
    let message = 'Avis enregistré avec succès';

    if (existing) {
      existing.rating = dto.rating;
      if (dto.comment !== undefined) {
        existing.comment = dto.comment || null;
      }
      saved = await this.feedbackRepository.save(existing);
      message = 'Avis mis à jour avec succès';
    } else {
      const refNumber = Math.floor(100000 + Math.random() * 900000);
      const reference = `AVIS-${service.id}-${refNumber}`;

      const feedback = this.feedbackRepository.create({
        serviceId: service.id,
        citizenId,
        rating: dto.rating,
        comment: dto.comment || null,
        reference,
      });

      saved = await this.feedbackRepository.save(feedback);
    }

    const stats = await this.getServiceStats(service.id);

    return {
      message,
      reference: saved.reference,
      feedback: saved,
      ...stats,
    };
  }

  async getServiceStats(serviceId: number): Promise<{ averageRating: number; totalFeedbacks: number }> {
    const feedbacks = await this.feedbackRepository.find({
      where: { serviceId },
    });

    if (feedbacks.length === 0) {
      return { averageRating: 0, totalFeedbacks: 0 };
    }

    const sum = feedbacks.reduce((acc, f) => acc + f.rating, 0);
    const averageRating = Number((sum / feedbacks.length).toFixed(1));

    return {
      averageRating,
      totalFeedbacks: feedbacks.length,
    };
  }

  async findAllForAgent(serviceId?: number) {
    const qb = this.feedbackRepository
      .createQueryBuilder('fb')
      .leftJoinAndSelect('fb.service', 'service')
      .leftJoinAndSelect('fb.citizen', 'citizen')
      .orderBy('fb.createdAt', 'DESC');

    if (serviceId) {
      qb.where('fb.serviceId = :serviceId', { serviceId });
    }

    const items = await qb.getMany();
    return items.map((item) => ({
      id: item.id,
      reference: item.reference,
      rating: item.rating,
      comment: item.comment,
      createdAt: item.createdAt,
      service: item.service
        ? {
            id: item.service.id,
            name: item.service.name,
            slug: item.service.slug,
          }
        : null,
      citizen: item.citizen
        ? {
            id: item.citizen.id,
            firstName: item.citizen.firstName,
            lastName: item.citizen.lastName,
            email: item.citizen.email,
          }
        : null,
    }));
  }
}
