import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService, type SafeUser } from '../users/users.service.js';
import { UserRole } from '../users/user-role.enum.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { LoginAttemptsService } from './login-attempts.service.js';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly loginAttemptsService: LoginAttemptsService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    // Role is always "citizen" here, regardless of what the client sends:
    // RegisterDto has no `role` field, and ValidationPipe strips/rejects
    // any extra property (see main.ts), so there is no path for a client
    // to pick its own role at registration.
    return this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.CITIZEN,
    });
  }

  async login(
    dto: LoginDto,
    ip: string,
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

    const accessToken = await this.jwtService.signAsync({
      sub: user!.id,
      email: user!.email,
      role: user!.role,
    });
    return { accessToken };
  }
}
