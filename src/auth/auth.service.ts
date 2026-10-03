import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService, type SafeUser } from '../users/users.service.js';
import { UserRole } from '../users/user-role.enum.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { KnownDevice } from './entities/known-device.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType } from '../notifications/notification-type.enum.js';
import { AuditService } from '../audit/audit.service.js';
import { parseUserAgent } from './ua-parser.util.js';
import { User } from '../users/entities/user.entity.js';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly loginAttemptsService: LoginAttemptsService,
    @InjectRepository(KnownDevice)
    private readonly knownDeviceRepository: Repository<KnownDevice>,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  private computeFingerprint(userAgent: string): string {
    return crypto.createHash('sha256').update(userAgent || 'unknown').digest('hex');
  }

  async register(dto: RegisterDto, ip = 'unknown', userAgent = ''): Promise<SafeUser> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    // Role is always "citizen" here, regardless of what the client sends:
    // RegisterDto has no `role` field, and ValidationPipe strips/rejects
    // any extra property (see main.ts), so there is no path for a client
    // to pick its own role at registration.
    const createdUser = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.CITIZEN,
    });

    // Enregistrer le premier appareil sans notification
    try {
      const fingerprint = this.computeFingerprint(userAgent);
      const label = parseUserAgent(userAgent);
      const device = this.knownDeviceRepository.create({
        userId: Number(createdUser.id),
        deviceFingerprint: fingerprint,
        label,
        lastIp: ip,
      });
      await this.knownDeviceRepository.save(device);
    } catch {
      // Ignorer silencieusement si l'enregistrement de l'appareil échoue
    }

    return createdUser;
  }

  async login(
    dto: LoginDto,
    ip: string,
    userAgent = '',
  ): Promise<{ accessToken: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Check if email is currently locked out based on recent login attempts
    const { isLocked, lockedUntil } =
      await this.loginAttemptsService.checkLockout(normalizedEmail);

    if (isLocked && lockedUntil) {
      await this.loginAttemptsService.recordAttempt(normalizedEmail, ip, false);
      const unlockTimeIso = lockedUntil.toISOString();
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Compte temporairement verrouillé suite à 5 tentatives infructueuses. Déverrouillage prévu à ${unlockTimeIso}.`,
          lockedUntil: unlockTimeIso,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Validate credentials
    const user = await this.usersService.findForAuthByEmail(normalizedEmail);
    const passwordValid =
      user && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!passwordValid || user.isActive === false) {
      await this.loginAttemptsService.recordAttempt(normalizedEmail, ip, false);

      // Check if this latest attempt just triggered the 5-attempt lockout
      const postAttemptLock =
        await this.loginAttemptsService.checkLockout(normalizedEmail);
      if (postAttemptLock.isLocked && postAttemptLock.lockedUntil) {
        const unlockTimeIso = postAttemptLock.lockedUntil.toISOString();
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: `Compte temporairement verrouillé suite à 5 tentatives infructueuses. Déverrouillage prévu à ${unlockTimeIso}.`,
            lockedUntil: unlockTimeIso,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Success (user is guaranteed non-null and active here)
    await this.loginAttemptsService.recordAttempt(normalizedEmail, ip, true);

    // 4. Handle KnownDevice tracking & new device security alert
    try {
      const fingerprint = this.computeFingerprint(userAgent);
      const label = parseUserAgent(userAgent);

      const existingDevice = await this.knownDeviceRepository.findOne({
        where: { userId: user.id, deviceFingerprint: fingerprint },
      });

      if (existingDevice) {
        existingDevice.lastIp = ip;
        existingDevice.lastSeenAt = new Date();
        await this.knownDeviceRepository.save(existingDevice);
      } else {
        // Nouvel appareil
        const newDevice = this.knownDeviceRepository.create({
          userId: user.id,
          deviceFingerprint: fingerprint,
          label,
          lastIp: ip,
        });
        await this.knownDeviceRepository.save(newDevice);

        const nowStr = new Date().toLocaleString('fr-FR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        // Créer notification de type sécurité
        const notifTitle = `Nouvelle connexion à votre compte depuis ${label}, le ${nowStr}. Si ce n'est pas vous, changez immédiatement votre mot de passe.`;
        await this.notificationsService.create({
          user: { id: user.id } as User,
          type: NotificationType.SECURITY,
          title: notifTitle,
          link: '/me/security',
        });

        // Entrée dans l'audit log
        await this.auditService.log({
          action: 'auth.new_device_login',
          entityType: 'User',
          entityId: String(user.id),
          details: {
            label,
            ip,
            userAgent,
          },
          author: { id: user.id } as User,
          ipAddress: ip,
        });
      }
    } catch (err) {
      // Ne pas bloquer la connexion en cas d'erreur annexe de tracking
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user!.id,
      email: user!.email,
      role: user!.role,
    });
    return { accessToken };
  }
}
