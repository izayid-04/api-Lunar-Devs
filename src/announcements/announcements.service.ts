import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import type { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import type { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';
import { Announcement } from './entities/announcement.entity.js';

// Author is tracked for internal accountability only — never exposed
// through the public API (announcements are public content; the
// authoring agent/admin account is not).
type PublicAnnouncement = Omit<Announcement, 'author'>;

@Injectable()
export class AnnouncementsService {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(Announcement);
  }

  async findAll(): Promise<PublicAnnouncement[]> {
    const announcements = await this.repository.find({
      order: { publishedAt: 'DESC' },
    });
    return announcements.map((announcement) => this.toPublic(announcement));
  }

  async findOne(id: number): Promise<PublicAnnouncement> {
    const announcement = await this.repository.findOne({ where: { id } });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return this.toPublic(announcement);
  }

  async create(
    authorId: number,
    dto: CreateAnnouncementDto,
  ): Promise<PublicAnnouncement> {
    const announcement = this.repository.create({
      title: dto.title,
      body: dto.body,
      category: dto.category,
      publishedAt: new Date(),
      author: { id: authorId } as User,
    });
    const saved = await this.repository.save(announcement);
    return this.toPublic(saved);
  }

  async update(
    id: number,
    dto: UpdateAnnouncementDto,
  ): Promise<PublicAnnouncement> {
    const announcement = await this.repository.findOne({ where: { id } });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    // Not Object.assign(announcement, dto): an optional DTO field left
    // out of the request body still exists on the DTO instance as an
    // explicit `undefined` own property (TS class field semantics), so
    // a blind assign would null out every field the client didn't send.
    if (dto.title !== undefined) announcement.title = dto.title;
    if (dto.body !== undefined) announcement.body = dto.body;
    if (dto.category !== undefined) announcement.category = dto.category;
    const saved = await this.repository.save(announcement);
    return this.toPublic(saved);
  }

  async remove(id: number): Promise<void> {
    const result = await this.repository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Announcement not found');
    }
  }

  private toPublic(announcement: Announcement): PublicAnnouncement {
    const { author: _author, ...rest } = announcement;
    return rest;
  }
}
