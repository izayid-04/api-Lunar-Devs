import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity.js';
import { UserRole } from './user-role.enum.js';
import { Appointment } from '../appointments/entities/appointment.entity.js';
import { AppointmentSlot } from '../appointments/entities/appointment-slot.entity.js';
import type { ListCitizensQueryDto } from './dto/list-citizens-query.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/notification-type.enum.js';
import { LoginAttemptsService } from '../auth/login-attempts.service.js';

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
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => LoginAttemptsService))
    private readonly loginAttemptsService: LoginAttemptsService,
  ) {}

  private get repository() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return this.dataSource.getRepository(User);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  // Utilisé spécifiquement pour la connexion : sélectionne explicitement passwordHash
  findForAuthByEmail(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  findById(id: number): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  // Utilisé spécifiquement pour DELETE /me : sélectionne explicitement passwordHash
  findWithPasswordById(id: number): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
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
    const user = await this.findWithPasswordById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(passwordConfirmation, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }

    await this.auditService.log({
      action: 'citizen_account_deleted',
      entityType: 'User',
      entityId: String(userId),
      details: { email: user.email, name: `${user.firstName} ${user.lastName}` },
      author: user,
    });

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

  // D03 / F37 : PATCH /me/password
  async changePassword(
    userId: number,
    dto: { currentPassword: string; newPassword: string },
    ip: string,
  ): Promise<{ message: string }> {
    const user = await this.findWithPasswordById(userId);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    // 1. Vérification du mot de passe actuel
    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      // Compte dans les échecs de connexion (F37)
      await this.loginAttemptsService.recordAttempt(user.email, ip, false);
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    // 2. Vérification que le nouveau mot de passe est différent de l'ancien
    const isSameAsOld = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSameAsOld) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l’ancien mot de passe');
    }

    // 3. Mise à jour du hash
    const saltRounds = 10;
    const newHash = await bcrypt.hash(dto.newPassword, saltRounds);
    user.passwordHash = newHash;
    await this.repository.save(user);

    // 4. Enregistrement d'une tentative réussie pour la sécurité
    await this.loginAttemptsService.recordAttempt(user.email, ip, true);

    // 5. Notification envoyée au citoyen
    await this.notificationsService.create({
      user,
      type: NotificationType.ALERT,
      title: 'Votre mot de passe a été modifié. Si ce n’est pas vous, contactez la mairie.',
      link: '/me/security',
    });

    // 6. Entrée dans l'audit log
    await this.auditService.log({
      action: 'user_password_changed',
      entityType: 'User',
      entityId: String(userId),
      details: { email: user.email },
      author: user,
      ipAddress: ip,
    });

    return {
      message: 'Mot de passe modifié avec succès.',
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
    actingUserId: number,
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

    const actingUser = await this.findById(actingUserId);
    await this.auditService.log({
      action: isActive ? 'citizen_account_activated' : 'citizen_account_deactivated',
      entityType: 'User',
      entityId: String(targetUserId),
      details: {
        citizenEmail: targetUser.email,
        isActive,
      },
      author: actingUser ?? null,
    });

    return this.toSafe(saved);
  }

  // D08 / D09 : GET /admin/users avec filtrage par rôle, recherche et pagination
  async adminFindUsers(query: {
    q?: string;
    role?: UserRole;
    page?: number;
    limit?: number;
  }): Promise<PaginatedCitizens> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.repository.createQueryBuilder('user');

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

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

  // D08 / D09 : POST /admin/users - création d'un compte agent ou citoyen par l'admin
  async adminCreateUser(
    dto: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      district?: string;
    },
    actingUserId: number,
  ): Promise<SafeUser> {
    const existing = await this.findByEmail(dto.email.trim().toLowerCase());
    if (existing) {
      throw new BadRequestException('Un utilisateur existe déjà avec cet email.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = this.repository.create({
      email: dto.email.trim().toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
      district: dto.district,
      isActive: true,
      profileCompleted: Boolean(dto.district),
    });

    const saved = await this.repository.save(user);

    const actingUser = await this.findById(actingUserId);
    await this.auditService.log({
      action: 'admin_user_created',
      entityType: 'User',
      entityId: String(saved.id),
      details: {
        createdEmail: saved.email,
        role: saved.role,
      },
      author: actingUser ?? null,
    });

    return this.toSafe(saved);
  }

  // D08 / D09 : PATCH /admin/users/:id/role
  // Règle : l'administrateur ne peut pas se retirer lui-même son rôle admin
  async adminUpdateUserRole(
    targetUserId: number,
    newRole: UserRole,
    actingUserId: number,
  ): Promise<SafeUser> {
    const targetUser = await this.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (targetUser.id === actingUserId && newRole !== UserRole.ADMIN) {
      throw new BadRequestException(
        'Un administrateur ne peut pas se retirer à lui-même le rôle administrateur.',
      );
    }

    const previousRole = targetUser.role;
    targetUser.role = newRole;
    const saved = await this.repository.save(targetUser);

    const actingUser = await this.findById(actingUserId);
    await this.auditService.log({
      action: 'admin_user_role_updated',
      entityType: 'User',
      entityId: String(targetUserId),
      details: {
        userEmail: targetUser.email,
        previousRole,
        newRole,
      },
      author: actingUser ?? null,
    });

    return this.toSafe(saved);
  }

  // D08 / D09 : PATCH /admin/users/:id/status
  // Règle : l'administrateur ne peut pas se désactiver lui-même
  async adminUpdateUserStatus(
    targetUserId: number,
    isActive: boolean,
    actingUserId: number,
  ): Promise<SafeUser> {
    const targetUser = await this.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (targetUser.id === actingUserId && !isActive) {
      throw new BadRequestException(
        'Un administrateur ne peut pas désactiver son propre compte.',
      );
    }

    targetUser.isActive = isActive;
    const saved = await this.repository.save(targetUser);

    const actingUser = await this.findById(actingUserId);
    await this.auditService.log({
      action: isActive ? 'admin_user_activated' : 'admin_user_deactivated',
      entityType: 'User',
      entityId: String(targetUserId),
      details: {
        userEmail: targetUser.email,
        role: targetUser.role,
        isActive,
      },
      author: actingUser ?? null,
    });

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
