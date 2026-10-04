import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity.js';
import { Consultation } from './entities/consultation.entity.js';
import { ConsultationResponse } from './entities/consultation-response.entity.js';
import { Idea, IdeaStatus } from './entities/idea.entity.js';
import { PostConsultationResponseDto } from './dto/post-consultation-response.dto.js';
import { CreateIdeaDto } from './dto/create-idea.dto.js';
import { UpdateIdeaStatusDto } from './dto/update-idea-status.dto.js';

@Injectable()
export class ParticipationService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Consultation)
    private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(ConsultationResponse)
    private readonly responseRepository: Repository<ConsultationResponse>,
    @InjectRepository(Idea)
    private readonly ideaRepository: Repository<Idea>,
  ) {}

  async findAllProjects(): Promise<any[]> {
    const projects = await this.projectRepository.find({
      order: { createdAt: 'DESC' },
    });

    const results = [];
    for (const project of projects) {
      const consultations = await this.consultationRepository.find({
        where: { projectId: project.id },
      });
      results.push({
        ...project,
        consultations,
      });
    }
    return results;
  }

  async findProjectById(id: number): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const consultations = await this.consultationRepository.find({
      where: { projectId: project.id },
    });

    const consultationsWithStats = [];
    for (const c of consultations) {
      const responses = await this.responseRepository.find({
        where: { consultationId: c.id },
      });

      const stats: Record<string, number> = {};
      (c.options || []).forEach((opt) => {
        stats[opt] = 0;
      });

      responses.forEach((r) => {
        stats[r.option] = (stats[r.option] || 0) + 1;
      });

      consultationsWithStats.push({
        ...c,
        totalResponses: responses.length,
        aggregatedResults: stats,
      });
    }

    return {
      ...project,
      consultations: consultationsWithStats,
    };
  }

  async submitOrUpdateConsultationResponse(

    consultationId: number,
    citizenId: number,
    dto: PostConsultationResponseDto,
  ): Promise<{
    message: string;
    reference: string;
    response: ConsultationResponse;
    aggregatedResults: Record<string, number>;
    totalResponses: number;
  }> {
    const consultation = await this.consultationRepository.findOne({
      where: { id: consultationId },
    });


    if (!consultation) {
      throw new NotFoundException(`Consultation with ID ${consultationId} not found`);
    }

    const now = new Date();
    if (new Date(consultation.endDate) < now) {
      throw new BadRequestException('Cette consultation est terminée');
    }

    if (!consultation.options.includes(dto.option)) {
      throw new BadRequestException(
        `L'option choisie n'est pas valide. Options possibles : ${consultation.options.join(', ')}`,
      );
    }

    let existing = await this.responseRepository.findOne({
      where: { consultationId, citizenId },
    });

    let savedResponse: ConsultationResponse;
    let message = 'Avis enregistré avec succès';

    if (existing) {
      existing.option = dto.option;
      if (dto.comment !== undefined) {
        existing.comment = dto.comment || null;
      }
      savedResponse = await this.responseRepository.save(existing);
      message = 'Avis mis à jour avec succès';
    } else {
      const refNumber = Math.floor(100000 + Math.random() * 900000);
      const reference = `CONS-${consultationId}-${refNumber}`;

      const newResponse = this.responseRepository.create({
        consultationId,
        citizenId,
        reference,
        option: dto.option,
        comment: dto.comment || null,
      });

      savedResponse = await this.responseRepository.save(newResponse);
    }

    // Calculate updated aggregated results
    const allResponses = await this.responseRepository.find({
      where: { consultationId },
    });

    const stats: Record<string, number> = {};
    (consultation.options || []).forEach((opt) => {
      stats[opt] = 0;
    });

    allResponses.forEach((r) => {
      stats[r.option] = (stats[r.option] || 0) + 1;
    });

    return {
      message,
      reference: savedResponse.reference,
      response: savedResponse,
      aggregatedResults: stats,
      totalResponses: allResponses.length,
    };
  }

  async createIdea(citizenId: number, dto: CreateIdeaDto): Promise<Idea> {
    const dateStr = new Date().getFullYear().toString();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const reference = `IDEE-${dateStr}-${rand}`;

    // F81 : Honeypot anti-spam
    if (dto.website && dto.website.trim().length > 0) {
      return {
        id: Math.floor(100000 + Math.random() * 900000),
        reference,
        title: dto.title,
        description: dto.description,
        district: dto.district || null,
        status: IdeaStatus.SOUMISE,
        adminNote: null,
        citizenId,
        citizen: null as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const idea = this.ideaRepository.create({
      reference,
      title: dto.title,
      description: dto.description,
      district: dto.district || null,
      status: IdeaStatus.SOUMISE,
      citizenId,
    });

    return this.ideaRepository.save(idea);
  }

  async findCitizenIdeas(citizenId: number): Promise<Idea[]> {
    return this.ideaRepository.find({
      where: { citizenId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllIdeasForAgent(status?: IdeaStatus): Promise<Idea[]> {
    const qb = this.ideaRepository
      .createQueryBuilder('idea')
      .leftJoinAndSelect('idea.citizen', 'citizen')
      .orderBy('idea.createdAt', 'DESC');

    if (status) {
      qb.where('idea.status = :status', { status });
    }

    return qb.getMany();
  }

  async updateIdeaStatus(id: number, dto: UpdateIdeaStatusDto): Promise<Idea> {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: { citizen: true },
    });

    if (!idea) {
      throw new NotFoundException(`Idea with ID ${id} not found`);
    }

    idea.status = dto.status;
    if (dto.adminNote !== undefined) {
      idea.adminNote = dto.adminNote || null;
    }

    return this.ideaRepository.save(idea);
  }
}
