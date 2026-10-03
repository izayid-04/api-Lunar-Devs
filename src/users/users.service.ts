import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity.js';
import { UserRole } from './user-role.enum.js';
import { Appointment } from '../appointments/entities/appointment.entity.js';
import { AppointmentSlot } from '../appointments/entities/appointment-slot.entity.js';
import type { ListCitizensQueryDto } from './dto/list-citizens-query.dto.js';

export type SafeUser = Omit<
  User,
  'passwordHash' | 'id' | 'failedLoginAttempts' | 'lockedUntil'
> & { id: string };

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface PaginatedCitizens {
  data: SafeUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(User);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findSafeById(id: number): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toSafe(user);
  }

  async create(input: CreateUserInput): Promise<SafeUser> {
    const user = this.repository.create({
      ...input,
      isActive: true,
    });
    const saved = await this.repository.save(user);
    return this.toSafe(saved);
  }

  countByRole(role: UserRole): Promise<number> {
    return this.repository.count({ where: { role } });
  }

  async updateProfile(
    id: number,
    patch: {
      district?: string;
      preferredLanguage?: string;
      isVulnerable?: boolean;
    },
  ): Promise<SafeUser> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (patch.district !== undefined) user.district = patch.district;
    if (patch.preferredLanguage !== undefined) {
      user.preferredLanguage = patch.preferredLanguage;
    }
    if (patch.isVulnerable !== undefined) user.isVulnerable = patch.isVulnerable;

    user.profileCompleted = Boolean(user.district && user.preferredLanguage);

    const saved = await this.repository.save(user);
    return this.toSafe(saved);
  }

  // F33 : DELETE /me avec mot de passe et nettoyage sécurisé des données
  async deleteAccount(userId: number, passwordConfirmation: string): Promise<{ success: boolean; message: string }> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(passwordConfirmation, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    await this.dataSource.transaction(async (manager) => {
      // 1. Libérer les créneaux des rendez-vous à venir du citoyen
      const apptRepo = manager.getRepository(Appointment);
      const slotRepo = manager.getRepository(AppointmentSlot);

      const appointments = await apptRepo.find({
        where: { citizen: { id: userId } },
        relations: { slot: true },
      });

      for (const appt of appointments) {
        if (appt.slot) {
          appt.slot.isAvailable = true;
          await slotRepo.save(appt.slot);
        }
      }

      // 2. Supprimer l'utilisateur (les clés étrangères citizen_messages, notifications, appointments sont en CASCADE)
      await manager.getRepository(User).delete(userId);
    });

    return {
      success: true,
      message: 'Compte supprimé avec succès.',
    };
  }

  // F34 : GET /agent/citizens avec recherche et pagination
  async findCitizens(query: ListCitizensQueryDto): Promise<PaginatedCitizens> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.repository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.CITIZEN });

    if (query.q && query.q.trim()) {
      const search = `%${query.q.trim()}%`;
      qb.andWhere(
        '(user.first_name LIKE :search OR user.last_name LIKE :search OR user.email LIKE :search)',
        { search },
      );
    }

    qb.orderBy('user.created_at', 'DESC').skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((u) => this.toSafe(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // F34 : PATCH /agent/citizens/:id/status (activer / désactiver)
  // Règle : un agent ne peut pas modifier un agent ou un admin
  async updateCitizenStatus(
    targetUserId: number,
    isActive: boolean,
    actingUserRole: UserRole,
  ): Promise<SafeUser> {
    const targetUser = await this.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (targetUser.role !== UserRole.CITIZEN) {
      throw new ForbiddenException(
        'Impossible de modifier le statut d un compte agent ou administrateur.',
      );
    }

    targetUser.isActive = isActive;
    const saved = await this.repository.save(targetUser);
    return this.toSafe(saved);
  }

  toSafe(user: User): SafeUser {
    const {
      passwordHash: _passwordHash,
      id,
      failedLoginAttempts: _fla,
      lockedUntil: _lu,
      ...safe
    } = user;
    return { ...safe, id: String(id) };
  }

  async recordFailedLogin(user: User): Promise<{ isLocked: boolean; lockedUntil: Date | null }> {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      user.failedLoginAttempts = 0; // reset counter after locking
      await this.repository.save(user);
      return { isLocked: true, lockedUntil: user.lockedUntil };
    }
    await this.repository.save(user);
    return { isLocked: false, lockedUntil: null };
  }

  async resetFailedAttempts(user: User): Promise<void> {
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      await this.repository.save(user);
    }
  }
}
