import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppointmentSlot } from './entities/appointment-slot.entity.js';
import { Appointment } from './entities/appointment.entity.js';
import { AppointmentStatus } from './appointment-status.enum.js';
import { User } from '../users/entities/user.entity.js';
import { MunicipalService } from '../services/entities/municipal-service.entity.js';
import type { BookAppointmentDto } from './dto/book-appointment.dto.js';

@Injectable()
export class AppointmentsService {
  constructor(private readonly dataSource: DataSource) {}

  private get slotRepository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(AppointmentSlot);
  }

  private get appointmentRepository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(Appointment);
  }

  // Get available slots for a municipal service
  async getAvailableSlots(serviceIdOrSlug: string | number): Promise<AppointmentSlot[]> {
    const qb = this.slotRepository
      .createQueryBuilder('slot')
      .innerJoinAndSelect('slot.service', 'service')
      .leftJoinAndSelect('slot.agent', 'agent')
      .where('slot.is_available = true')
      .andWhere('slot.starts_at > :now', { now: new Date() });

    if (!isNaN(Number(serviceIdOrSlug))) {
      qb.andWhere('(service.id = :id OR service.slug = :slug)', {
        id: Number(serviceIdOrSlug),
        slug: String(serviceIdOrSlug),
      });
    } else {
      qb.andWhere('service.slug = :slug', { slug: String(serviceIdOrSlug) });
    }

    return qb.orderBy('slot.starts_at', 'ASC').getMany();
  }

  // Book an appointment slot with optimistic concurrency control
  async bookAppointment(
    citizenId: number,
    slotId: number,
    dto: BookAppointmentDto,
  ): Promise<Appointment> {
    return this.dataSource.transaction(async (manager) => {
      const slotRepo = manager.getRepository(AppointmentSlot);
      const aptRepo = manager.getRepository(Appointment);

      // Lock row or check availability with optimistic version
      const slot = await slotRepo.findOne({
        where: { id: slotId },
        relations: { service: true, agent: true },
      });

      if (!slot) {
        throw new NotFoundException('Appointment slot not found');
      }

      if (!slot.isAvailable) {
        throw new ConflictException('This slot is already booked');
      }

      // Mark slot as booked
      slot.isAvailable = false;
      await slotRepo.save(slot);

      // Create appointment
      const appointment = aptRepo.create({
        citizen: { id: citizenId } as User,
        slot,
        reason: dto.reason,
        requiredDocuments: dto.requiredDocuments ?? null,
        status: AppointmentStatus.CONFIRME,
      });

      const savedApt = await aptRepo.save(appointment);

      // Return loaded with all relations
      return aptRepo.findOneOrFail({
        where: { id: savedApt.id },
        relations: {
          slot: { service: true, agent: true },
          citizen: true,
        },
      });
    });
  }

  // Citizen's appointments
  async getMyAppointments(citizenId: number): Promise<Appointment[]> {
    return this.appointmentRepository.find({
      where: { citizen: { id: citizenId } },
      relations: {
        slot: { service: true, agent: true },
      },
      order: { createdAt: 'DESC' },
    });
  }

  // Cancel appointment by citizen
  async cancelAppointment(citizenId: number, appointmentId: number): Promise<Appointment> {
    return this.dataSource.transaction(async (manager) => {
      const aptRepo = manager.getRepository(Appointment);
      const slotRepo = manager.getRepository(AppointmentSlot);

      const apt = await aptRepo.findOne({
        where: { id: appointmentId, citizen: { id: citizenId } },
        relations: { slot: true },
      });

      if (!apt) {
        throw new NotFoundException('Appointment not found');
      }

      if (apt.status === AppointmentStatus.ANNULE) {
        throw new BadRequestException('Appointment is already cancelled');
      }

      apt.status = AppointmentStatus.ANNULE;
      await aptRepo.save(apt);

      // Release slot
      if (apt.slot) {
        apt.slot.isAvailable = true;
        await slotRepo.save(apt.slot);
      }

      return apt;
    });
  }

  // Agent appointments for their assigned service or all
  async getAgentAppointments(serviceId?: number): Promise<Appointment[]> {
    const qb = this.appointmentRepository
      .createQueryBuilder('apt')
      .innerJoinAndSelect('apt.slot', 'slot')
      .innerJoinAndSelect('slot.service', 'service')
      .leftJoinAndSelect('slot.agent', 'agent')
      .innerJoinAndSelect('apt.citizen', 'citizen')
      .orderBy('slot.starts_at', 'ASC');

    if (serviceId) {
      qb.where('service.id = :serviceId', { serviceId });
    }

    return qb.getMany();
  }

  // Generate ICS calendar format for an appointment
  async generateIcs(
    appointmentId: number,
    currentUser: { sub: number; role: string },
  ): Promise<string> {
    const apt = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
      relations: {
        slot: { service: true, agent: true },
        citizen: true,
      },
    });

    if (!apt) {
      throw new NotFoundException('Appointment not found');
    }

    // Must be the appointment owner, or an agent/admin
    const isOwner = apt.citizen.id === currentUser.sub;
    const isStaff = currentUser.role === 'agent' || currentUser.role === 'admin';

    if (!isOwner && !isStaff) {
      throw new NotFoundException('Appointment not found');
    }

    const formatDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const start = formatDate(new Date(apt.slot.startsAt));
    const end = formatDate(new Date(apt.slot.endsAt));
    const now = formatDate(new Date());
    const uid = `apt-${apt.id}@novaterra.city`;
    const summary = `RDV Municipal - ${apt.slot.service.name}`;
    const description = `Motif : ${apt.reason}\\nLieu : ${apt.slot.location}\\nDocuments : ${apt.requiredDocuments ?? 'Aucun'}`;
    const location = apt.slot.location;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ville de Nova Terra//Plateforme Numerique//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
}
